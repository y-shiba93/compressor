const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { URL } = require('node:url');
const { optimizeImage } = require('./index');

const PUBLIC_DIR = path.resolve(__dirname, '..', 'public');
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ASSETS = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/app.js', ['app.js', 'text/javascript; charset=utf-8']],
]);

function readBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_UPLOAD_BYTES) {
        reject(Object.assign(new Error('画像は50MB以下にしてください'), { statusCode: 413 }));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks)));
    request.on('error', reject);
  });
}

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, { 'content-type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

function downloadHeader(filename) {
  const fallback = filename.replace(/[^A-Za-z0-9._-]/g, '_');
  return `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}

function createServer() {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (request.method === 'GET' && url.pathname === '/api/health') {
        sendJson(response, 200, { ok: true });
        return;
      }
      if (request.method === 'POST' && url.pathname === '/api/compress') {
        const filename = url.searchParams.get('filename');
        if (!filename) {
          sendJson(response, 400, { error: 'filenameが必要です' });
          return;
        }
        const input = await readBody(request);
        const result = await optimizeImage(input, filename);
        response.writeHead(200, {
          'content-type': result.mimeType,
          'content-disposition': downloadHeader(result.filename),
          'content-length': result.outputBytes,
          'x-output-filename': encodeURIComponent(result.filename),
          'x-original-bytes': result.originalBytes,
          'x-output-bytes': result.outputBytes,
          'x-image-optimized': String(result.optimized),
          'x-target-reached': String(result.targetReached),
          'access-control-expose-headers': 'x-output-filename,x-original-bytes,x-output-bytes,x-image-optimized,x-target-reached',
        });
        response.end(result.buffer);
        return;
      }
      if (request.method === 'GET' && ASSETS.has(url.pathname)) {
        const [filename, contentType] = ASSETS.get(url.pathname);
        response.writeHead(200, { 'content-type': contentType });
        fs.createReadStream(path.join(PUBLIC_DIR, filename)).pipe(response);
        return;
      }
      sendJson(response, 404, { error: 'Not found' });
    } catch (error) {
      if (!response.headersSent) sendJson(response, error.statusCode ?? 400, { error: error.message });
      else response.destroy(error);
    }
  });
}

function startServer({ host = '127.0.0.1', port = 4173 } = {}) {
  const server = createServer();
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve(server));
  });
}

if (require.main === module) {
  const hostFlag = process.argv.indexOf('--host');
  const portFlag = process.argv.indexOf('--port');
  const host = hostFlag >= 0 ? process.argv[hostFlag + 1] : (process.env.HOST || '127.0.0.1');
  const port = Number(portFlag >= 0 ? process.argv[portFlag + 1] : (process.env.PORT || 4173));
  startServer({ host, port })
    .then(() => console.log(`画像圧縮UI: http://${host}:${port}`))
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { createServer, startServer };
