const assert = require('node:assert/strict');
const { test } = require('node:test');
const sharp = require('sharp');
const { startServer } = require('../src/server');

test('Web APIがUIと圧縮画像を返す', async (context) => {
  const server = await startServer({ port: 0 });
  context.after(() => server.close());
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;

  const page = await fetch(origin);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /画像を、投稿にちょうどいい軽さへ/);

  const input = await sharp({
    create: { width: 1800, height: 1200, channels: 4, background: '#dd6b45' },
  }).png().toBuffer();
  const response = await fetch(`${origin}/api/compress?filename=sample.png`, {
    method: 'POST',
    body: input,
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'image/webp');
  assert.equal(decodeURIComponent(response.headers.get('x-output-filename')), 'sample.webp');
  assert.ok((await response.arrayBuffer()).byteLength > 0);
});
