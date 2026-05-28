require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT || '8000', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  headless: (process.env.HEADLESS || 'true').toLowerCase() === 'true',
  timeout: parseInt(process.env.TIMEOUT_MS || '30000', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || '2', 10),
  apiKey: process.env.API_KEY || null,
  authUrl: (
    'https://login.microsoftonline.com/common/oauth2/v2.0/authorize'
    + '?scope=service%3A%3Aaccount.microsoft.com%3A%3AMBI_SSL%20openid%20profile%20offline_access'
    + '&response_type=code'
    + '&client_id=81feaced-5ddd-41e7-8bef-3e20a2689bb7'
    + '&redirect_uri=https%3A%2F%2Faccount.microsoft.com%2Fauth%2Fcomplete-signin-oauth'
    + '&prompt=login'
    + '&msaoauth2=true'
  ),
};