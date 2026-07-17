const http = require('node:http');

async function startApp(app) {
  const server = http.createServer(app);
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return server;
}

function request(server, pathname, { method = 'GET', headers = {}, body } = {}) {
  const address = server.address();
  const payload = body === undefined
    ? undefined
    : typeof body === 'string' ? body : JSON.stringify(body);
  const requestHeaders = { ...headers };

  if (payload !== undefined && !requestHeaders['Content-Length']) {
    requestHeaders['Content-Length'] = Buffer.byteLength(payload);
  }

  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: '127.0.0.1',
      port: address.port,
      path: pathname,
      method,
      headers: requestHeaders
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json;
        try {
          json = JSON.parse(text);
        } catch {
          json = undefined;
        }
        resolve({ status: res.statusCode, headers: res.headers, text, json });
      });
    });
    req.on('error', reject);
    if (payload !== undefined) req.write(payload);
    req.end();
  });
}

async function stopServer(server) {
  await new Promise((resolve) => server.close(resolve));
}

module.exports = { startApp, request, stopServer };
