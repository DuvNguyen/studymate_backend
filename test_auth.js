const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3001,
  path: '/api/v1/users',
  method: 'GET',
};

// ... we can't easily curl an authenticated route without token.
