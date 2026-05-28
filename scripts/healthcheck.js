const http = require('http');
const host = process.env.HOST || 'localhost';
const port = parseInt(process.env.PORT || '8000', 10);
const req = http.get('http://' + host + ':' + port + '/health', (res) => {
  if (res.statusCode === 200) { console.log('Health check passed'); process.exit(0); }
  else { console.error('Health check failed: status ' + res.statusCode); process.exit(1); }
});
req.on('error', (err) => { console.error('Health check failed: ' + err.message); process.exit(1); });
req.setTimeout(5000, () => { console.error('Health check timed out'); req.destroy(); process.exit(1); });