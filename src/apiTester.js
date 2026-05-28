async function testLoginViaApi(email, password) {
  const domain = email.split('@')[1];
  const personalDomains = ['outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'gmail.com', 'yahoo.com'];
  
  let tenantUrl;
  if (personalDomains.includes(domain)) {
    // Personal MSAs
    tenantUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  } else {
    // Work/school accounts
    tenantUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
  }

  const params = new URLSearchParams({
    grant_type: 'password',
    client_id: '81feaced-5ddd-41e7-8bef-3e20a2689bb7',
    username: email,
    password: password,
    scope: 'service::account.microsoft.com::MBI_SSL openid profile offline_access',
    client_info: '1',
  });

  try {
    const resp = await fetch(tenantUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const data = await resp.json();

    if (resp.ok && data.access_token) {
      return { success: true, message: 'Login successful - access token obtained' };
    }
    if (data.error === 'invalid_grant') {
      return { success: false, message: 'Invalid credentials: ' + (data.error_description || data.error) };
    }
    return { success: false, message: 'Auth failed: ' + data.error + ' - ' + (data.error_description || '') };
  } catch (err) {
    return { success: false, message: 'API error: ' + err.message };
  }
}

module.exports = { testLoginViaApi };