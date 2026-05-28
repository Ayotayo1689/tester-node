const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const BASE_URL = process.env.TEST_URL || 'https://tester-node.onrender.com';

async function fetchJson(url, options = {}) {
  const resp = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options
  });
  return { status: resp.status, data: await resp.json() };
}

describe('Microsoft Login Tester API', () => {
  it('health endpoint returns 200', async () => {
    const { status, data } = await fetchJson(BASE_URL + '/health');
    assert.equal(status, 200);
    assert.equal(data.status, 'healthy');
  });
  
  it('invalid password returns success=false', async () => {
    const { status, data } = await fetchJson(BASE_URL + '/api/v1/verify-login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com', password: 'DefinitelyWrongPassword!' }),
    });
    assert.equal(status, 200);
    assert.equal(data.success, false);
  });
  
  it('blank email returns success=false', async () => {
    const { status, data } = await fetchJson(BASE_URL + '/api/v1/verify-login', {
      method: 'POST',
      body: JSON.stringify({ email: '', password: 'SomePass1!' }),
    });
    assert.equal(status, 200);
    assert.equal(data.success, false);
  });
  
  it('missing password returns 422', async () => {
    const { status } = await fetchJson(BASE_URL + '/api/v1/verify-login', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com' }),
    });
    assert.equal(status, 422);
  });
});