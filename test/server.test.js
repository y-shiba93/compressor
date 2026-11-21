const assert = require("node:assert/strict");
const { test } = require("node:test");
const sharp = require("sharp");
const { startServer } = require("../src/server");

test("Web APIがUIと圧縮画像を返す", async (context) => {
  const server = await startServer({ port: 0 });
  context.after(() => server.close());
  const { port } = server.address();
  const origin = `http://127.0.0.1:${port}`;

  const page = await fetch(origin);
  assert.equal(page.status, 200);
  const html = await page.text();
  assert.match(html, /画像を、投稿にちょうどいい軽さへ/);
  assert.match(html, /data-mode="convert"/);
  assert.match(html, /data-mode="color"/);
  assert.match(
    html,
    /id="conversion-options"[^>]*hidden>[\s\S]*name="output-format"/,
  );
  assert.match(
    html,
    /id="color-options"[^>]*hidden>[\s\S]*id="color-output-format"/,
  );
  assert.doesNotMatch(html, /class="conversion-options" hidden><\/section>/);
  assert.match(html, /href="\/favicon.webp"/);

  const favicon = await fetch(`${origin}/favicon.webp`);
  assert.equal(favicon.status, 200);
  assert.equal(favicon.headers.get("content-type"), "image/webp");
  assert.ok((await favicon.arrayBuffer()).byteLength > 0);

  const input = await sharp({
    create: { width: 1800, height: 1200, channels: 4, background: "#dd6b45" },
  })
    .png()
    .toBuffer();
  const response = await fetch(`${origin}/api/compress?filename=sample.png`, {
    method: "POST",
    body: input,
  });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/webp");
  assert.equal(
    decodeURIComponent(response.headers.get("x-output-filename")),
    "sample.webp",
  );
  assert.ok((await response.arrayBuffer()).byteLength > 0);

  const converted = await fetch(
    `${origin}/api/convert?filename=sample.png&format=jpeg`,
    {
      method: "POST",
      body: input,
    },
  );
  assert.equal(converted.status, 200);
  assert.equal(converted.headers.get("content-type"), "image/jpeg");
  assert.equal(
    decodeURIComponent(converted.headers.get("x-output-filename")),
    "sample.jpg",
  );
  assert.equal(
    (await sharp(Buffer.from(await converted.arrayBuffer())).metadata()).format,
    "jpeg",
  );

  const replaced = await fetch(
    `${origin}/api/replace-color?filename=sample.png&sourceColor=%23dd6b45&targetColor=%23000000&tolerance=0&format=png`,
    {
      method: "POST",
      body: input,
    },
  );
  assert.equal(replaced.status, 200);
  assert.equal(replaced.headers.get("content-type"), "image/png");
  assert.equal(
    decodeURIComponent(replaced.headers.get("x-output-filename")),
    "sample.color.png",
  );
  assert.ok(Number(replaced.headers.get("x-matched-pixels")) > 0);
});
