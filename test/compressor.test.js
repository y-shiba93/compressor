const assert = require('node:assert/strict');
const { test } = require('node:test');
const sharp = require('sharp');
const { optimizeImage, prepareWordPressUpload } = require('../src');

test('大きなJPEGをWordPress向けに縮小する', async () => {
  const input = await sharp({
    create: { width: 2400, height: 1800, channels: 3, background: '#c65b3d' },
  }).jpeg({ quality: 100 }).toBuffer();
  const result = await optimizeImage(input, 'photo.JPG');
  const metadata = await sharp(result.buffer).metadata();

  assert.equal(result.filename, 'photo.jpg');
  assert.equal(result.mimeType, 'image/jpeg');
  assert.equal(result.optimized, true);
  assert.equal(metadata.width, 1600);
  assert.ok(result.outputBytes < result.originalBytes);
});

test('PNGをWebPに変換する', async () => {
  const input = await sharp({
    create: { width: 1200, height: 800, channels: 4, background: '#2f7668' },
  }).png().toBuffer();
  const result = await optimizeImage(input, 'map.png');
  const metadata = await sharp(result.buffer).metadata();

  assert.equal(result.filename, 'map.webp');
  assert.equal(result.mimeType, 'image/webp');
  assert.equal(metadata.format, 'webp');
});

test('GIFとSVGは内容を変更しない', async () => {
  const input = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>');
  const result = await optimizeImage(input, 'icon.svg');
  assert.equal(result.buffer, input);
  assert.equal(result.optimized, false);
  assert.equal(result.mimeType, 'image/svg+xml');
});

test('WordPress用ファイル名からパス要素を除去する', async () => {
  const input = await sharp({
    create: { width: 20, height: 20, channels: 3, background: '#ffffff' },
  }).jpeg().toBuffer();
  const result = await prepareWordPressUpload({
    input,
    sourceFilename: 'source.jpg',
    uploadFilename: '../station/photo.jpg',
  });
  assert.equal(result.filename.includes('/'), false);
  assert.equal(result.filename.includes('\\'), false);
});

test('未対応形式を拒否する', async () => {
  await assert.rejects(() => optimizeImage(Buffer.from('bad'), 'file.bmp'), /未対応/);
});
