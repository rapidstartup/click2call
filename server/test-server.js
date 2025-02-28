// Simple test server to check if port 3002 is available
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Test server is running on port 3002');
});

server.listen(3002, () => {
  console.log('Test server is running on port 3002');
});

// Handle errors
server.on('error', (error) => {
  console.error('Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.error('Port 3002 is already in use by another process');
  }
});

// Keep the server running for 60 seconds then exit
setTimeout(() => {
  console.log('Test complete, shutting down');
  server.close();
  process.exit(0);
}, 60000); 