# compressor

WordPress投稿向けの画像最適化を、共通API・CLI・ブラウザUIから利用するためのリポジトリです。

## 変換仕様

- 目標ファイルサイズ: 350KiB（画質を維持できる範囲で近づけます。必達ではありません）
- 最大幅: 1600px、最小幅: 800px
- JPEG: JPEGのまま、MozJPEG・プログレッシブ形式で最適化
- PNG / WebP: WebPへ変換
- GIF / SVG: 内容を変更せず通過
- EXIF Orientation: ピクセルへ反映し、表示方向を正規化
- 変換後のほうが大きい場合: 元画像をそのまま使用

## セットアップ

Node.js 20以上とpnpmを使用します。

```sh
pnpm install
pnpm test
```

## ブラウザUI

```sh
pnpm ui
```

ブラウザで <http://127.0.0.1:4173> を開き、画像をドラッグ＆ドロップします。初期状態ではローカル端末からだけ接続できます。

Apple Containerを利用する場合:

```sh
./container-tool build
./container-tool ui
```

## CLI

```sh
pnpm compress -- input.jpg --output output.jpg
pnpm compress -- input.png --output output.webp --target-kib 350 --max-width 1600
```

## Node API

```js
const fs = require('node:fs');
const { prepareWordPressUpload } = require('@kuro-shiba/image-compressor');

const prepared = await prepareWordPressUpload({
  input: fs.readFileSync('thumbnail.png'),
  sourceFilename: 'thumbnail.png',
  uploadFilename: 'article-thumbnail.png',
});

// prepared.buffer / prepared.filename / prepared.mimeTypeを
// WordPress REST APIのmediaエンドポイントへ送信する
```

WordPressのURL・認証・ALT・メディアID管理は呼び出し元の責務です。このリポジトリは、アップロード直前の画像データとファイル名を統一して生成します。

## Git submoduleとして利用

```sh
git submodule add https://github.com/y-shiba93/compressor.git packages/compressor
git submodule update --init --recursive
```

pnpm workspaceでは`packages/compressor`をworkspace packageとして参照できます。Pythonなどからは`node packages/compressor/src/cli.js`を呼び出せます。
