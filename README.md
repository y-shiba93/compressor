# compressor

WordPress投稿向けの画像圧縮と画像形式の変換を、共通API・CLI・ブラウザUIから利用するためのリポジトリです。

## 圧縮仕様

- 目標ファイルサイズ: 350KiB（画質を維持できる範囲で近づけます。必達ではありません）
- 最大幅: 1600px、最小幅: 800px
- JPEG: JPEGのまま、MozJPEG・プログレッシブ形式で最適化
- PNG / WebP: WebPへ変換
- GIF / SVG: 内容を変更せず通過
- EXIF Orientation: ピクセルへ反映し、表示方向を正規化
- 変換後のほうが大きい場合: 元画像をそのまま使用

## 画像形式の変換仕様

- PNG・WebP・JPEG間の相互変換に対応
- 画像の縦横サイズは維持
- JPEGへの変換時は透過部分を白背景に合成
- ブラウザUIでは「圧縮」「変換」タブを切り替えて使用

## カラー変更仕様

- PNG・WebP・JPEGに対応
- プレビュー画像をクリックして変更前カラーを取得
- 変更前・変更後のカラーコードを`#RRGGBB`形式で指定
- RGB空間上の色距離を`0〜100`の許容範囲として指定
- PNG・WebP・JPEGから保存形式を選択
- 透明度はPNG・WebPで維持し、JPEGでは白背景に合成

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

ブラウザで <http://127.0.0.1:4173> を開き、「圧縮」または「変換」タブを選んで画像をドラッグ＆ドロップします。初期状態ではローカル端末からだけ接続できます。

Apple Containerを利用する場合は、初回だけローカルドメインを`/etc/hosts`へ登録します。

```sh
sudo sh -c 'echo "127.0.0.1 local.compressor.tools.kuro-shiba.com" >> /etc/hosts'
./container-tool setup-https
./container-tool build
./container-tool ui
```

`setup-https`はローカルCAとサーバー証明書を`.certs/`へ生成し、CAをmacOSのログインキーチェーンへ信頼登録します。秘密鍵と証明書はGit管理されません。

Caddyがポート443でHTTPSリクエストを受け、コンテナ内のNode UIへ転送します。HTTPアクセスはHTTPSへリダイレクトされます。ブラウザで <https://local.compressor.tools.kuro-shiba.com> を開いてください。

`/etc/hosts`へ同じ行を重複して追加しないでください。すでに登録済みの場合は追加不要です。

## CLI

```sh
pnpm compress -- input.jpg --output output.jpg
pnpm compress -- input.png --output output.webp --target-kib 350 --max-width 1600
```

## Node API

```js
const fs = require("node:fs");
const {
  convertImage,
  prepareWordPressUpload,
  replaceImageColor,
} = require("@kuro-shiba/image-compressor");

const prepared = await prepareWordPressUpload({
  input: fs.readFileSync("thumbnail.png"),
  sourceFilename: "thumbnail.png",
  uploadFilename: "article-thumbnail.png",
});

// prepared.buffer / prepared.filename / prepared.mimeTypeを
// WordPress REST APIのmediaエンドポイントへ送信する

const webp = await convertImage(
  fs.readFileSync("photo.png"),
  "photo.png",
  "webp",
);

const recolored = await replaceImageColor(
  fs.readFileSync("icon.png"),
  "icon.png",
  {
    sourceColor: "#D75B36",
    targetColor: "#4D978F",
    tolerance: 20,
    outputFormat: "png",
  },
);
```

WordPressのURL・認証・ALT・メディアID管理は呼び出し元の責務です。このリポジトリは、アップロード直前の画像データとファイル名を統一して生成します。

## Git submoduleとして利用

```sh
git submodule add https://github.com/y-shiba93/compressor.git packages/compressor
git submodule update --init --recursive
```

pnpm workspaceでは`packages/compressor`をworkspace packageとして参照できます。Pythonなどからは`node packages/compressor/src/cli.js`を呼び出せます。
