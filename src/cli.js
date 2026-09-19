#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { optimizeImage } = require('./index');

function usage() {
  console.log(`使い方:
  image-compressor <入力画像> [--output <出力先>] [--target-kib 350] [--max-width 1600]

対応形式: jpg, jpeg, png, webp, gif, svg`);
}

function parseArguments(argv) {
  const args = [...argv];
  const inputPath = args.shift();
  if (!inputPath || inputPath === '--help' || inputPath === '-h') return { help: true };
  const result = { inputPath, outputPath: null, options: {} };

  while (args.length) {
    const flag = args.shift();
    const value = args.shift();
    if (!value) throw new TypeError(`${flag}の値がありません`);
    if (flag === '--output' || flag === '-o') result.outputPath = value;
    else if (flag === '--target-kib') result.options.targetBytes = Number(value) * 1024;
    else if (flag === '--max-width') result.options.maxWidth = Number(value);
    else throw new TypeError(`不明なオプションです: ${flag}`);
  }
  return result;
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }

  const inputPath = path.resolve(args.inputPath);
  const input = fs.readFileSync(inputPath);
  const result = await optimizeImage(input, path.basename(inputPath), args.options);
  const outputPath = path.resolve(
    args.outputPath ?? path.join(path.dirname(inputPath), `${path.parse(result.filename).name}.compressed${path.extname(result.filename)}`),
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, result.buffer);
  console.log(JSON.stringify({
    input: inputPath,
    output: outputPath,
    originalBytes: result.originalBytes,
    outputBytes: result.outputBytes,
    optimized: result.optimized,
    format: result.format,
    width: result.width,
    quality: result.quality,
    targetReached: result.targetReached,
  }));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
