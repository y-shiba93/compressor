const assert = require("node:assert/strict");
const { test } = require("node:test");
const sharp = require("sharp");
const {
  convertImage,
  optimizeImage,
  prepareWordPressUpload,
  replaceImageColor,
} = require("../src");

test("大きなJPEGをWordPress向けに縮小する", async () => {
  const input = await sharp({
    create: { width: 2400, height: 1800, channels: 3, background: "#c65b3d" },
  })
    .jpeg({ quality: 100 })
    .toBuffer();
  const result = await optimizeImage(input, "photo.JPG");
  const metadata = await sharp(result.buffer).metadata();

  assert.equal(result.filename, "photo.jpg");
  assert.equal(result.mimeType, "image/jpeg");
  assert.equal(result.optimized, true);
  assert.equal(metadata.width, 1600);
  assert.ok(result.outputBytes < result.originalBytes);
});

test("PNGをWebPに変換する", async () => {
  const input = await sharp({
    create: { width: 1200, height: 800, channels: 4, background: "#2f7668" },
  })
    .png()
    .toBuffer();
  const result = await optimizeImage(input, "map.png");
  const metadata = await sharp(result.buffer).metadata();

  assert.equal(result.filename, "map.webp");
  assert.equal(result.mimeType, "image/webp");
  assert.equal(metadata.format, "webp");
});

test("PNG・WebP・JPEGを相互変換する", async () => {
  const png = await sharp({
    create: {
      width: 120,
      height: 80,
      channels: 4,
      background: { r: 20, g: 40, b: 60, alpha: 0.5 },
    },
  })
    .png()
    .toBuffer();
  const jpeg = await convertImage(png, "sample.png", "jpeg");
  const webp = await convertImage(jpeg.buffer, jpeg.filename, "webp");
  const convertedPng = await convertImage(webp.buffer, webp.filename, "png");

  assert.equal(jpeg.filename, "sample.jpg");
  assert.equal((await sharp(jpeg.buffer).metadata()).format, "jpeg");
  assert.equal(webp.filename, "sample.webp");
  assert.equal((await sharp(webp.buffer).metadata()).format, "webp");
  assert.equal(convertedPng.filename, "sample.png");
  assert.equal((await sharp(convertedPng.buffer).metadata()).format, "png");
  assert.equal(convertedPng.width, 120);
  assert.equal(convertedPng.height, 80);
});

test("変換では未対応の出力形式とGIFを拒否する", async () => {
  const input = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "#ffffff" },
  })
    .png()
    .toBuffer();
  await assert.rejects(
    () => convertImage(input, "sample.png", "gif"),
    /outputFormat/,
  );
  await assert.rejects(
    () => convertImage(input, "sample.gif", "png"),
    /変換に未対応/,
  );
});

test("指定色と許容範囲内の色を置換する", async () => {
  const input = await sharp(
    Buffer.from([200, 50, 40, 255, 205, 54, 42, 255, 20, 40, 200, 255]),
    { raw: { width: 3, height: 1, channels: 4 } },
  )
    .png()
    .toBuffer();
  const result = await replaceImageColor(input, "colors.png", {
    sourceColor: "#C83228",
    targetColor: "#10A060",
    tolerance: 10,
    outputFormat: "png",
  });
  const { data } = await sharp(result.buffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  assert.equal(result.filename, "colors.color.png");
  assert.equal(result.matchedPixels, 2);
  assert.deepEqual([...data.subarray(0, 3)], [16, 160, 96]);
  assert.deepEqual([...data.subarray(4, 7)], [16, 160, 96]);
  assert.deepEqual([...data.subarray(8, 11)], [20, 40, 200]);
});

test("カラー変更の入力値を検証する", async () => {
  const input = await sharp({
    create: { width: 1, height: 1, channels: 3, background: "#ffffff" },
  })
    .png()
    .toBuffer();
  await assert.rejects(
    () =>
      replaceImageColor(input, "sample.png", {
        sourceColor: "red",
        targetColor: "#000000",
      }),
    /#RRGGBB/,
  );
  await assert.rejects(
    () =>
      replaceImageColor(input, "sample.png", {
        sourceColor: "#ffffff",
        targetColor: "#000000",
        tolerance: 101,
      }),
    /0〜100/,
  );
});

test("GIFとSVGは内容を変更しない", async () => {
  const input = Buffer.from(
    '<svg xmlns="http://www.w3.org/2000/svg"><rect width="1" height="1"/></svg>',
  );
  const result = await optimizeImage(input, "icon.svg");
  assert.equal(result.buffer, input);
  assert.equal(result.optimized, false);
  assert.equal(result.mimeType, "image/svg+xml");
});

test("WordPress用ファイル名からパス要素を除去する", async () => {
  const input = await sharp({
    create: { width: 20, height: 20, channels: 3, background: "#ffffff" },
  })
    .jpeg()
    .toBuffer();
  const result = await prepareWordPressUpload({
    input,
    sourceFilename: "source.jpg",
    uploadFilename: "../station/photo.jpg",
  });
  assert.equal(result.filename.includes("/"), false);
  assert.equal(result.filename.includes("\\"), false);
});

test("未対応形式を拒否する", async () => {
  await assert.rejects(
    () => optimizeImage(Buffer.from("bad"), "file.bmp"),
    /未対応/,
  );
});
