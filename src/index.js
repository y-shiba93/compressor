const path = require('node:path');
const sharp = require('sharp');

const DEFAULT_OPTIONS = Object.freeze({
  targetBytes: 350 * 1024,
  maxWidth: 1600,
  minWidth: 800,
  widthStep: 200,
  qualitySteps: Object.freeze([76, 72, 68, 64, 60]),
});

const COPY_EXTENSIONS = new Set(['.gif', '.svg']);
const RASTER_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function normalizeOptions(options = {}) {
  const normalized = {
    ...DEFAULT_OPTIONS,
    ...options,
    qualitySteps: options.qualitySteps ?? DEFAULT_OPTIONS.qualitySteps,
  };

  for (const key of ['targetBytes', 'maxWidth', 'minWidth', 'widthStep']) {
    if (!Number.isInteger(normalized[key]) || normalized[key] <= 0) {
      throw new TypeError(`${key}は正の整数で指定してください`);
    }
  }
  if (normalized.minWidth > normalized.maxWidth) {
    throw new TypeError('minWidthはmaxWidth以下にしてください');
  }
  if (!Array.isArray(normalized.qualitySteps) || normalized.qualitySteps.length === 0) {
    throw new TypeError('qualityStepsを1件以上指定してください');
  }
  if (normalized.qualitySteps.some((quality) => !Number.isInteger(quality) || quality < 1 || quality > 100)) {
    throw new TypeError('qualityStepsは1〜100の整数で指定してください');
  }
  return normalized;
}

function sanitizeFilename(filename) {
  const basename = path.basename(String(filename || '').replace(/[\\/]/g, '-'));
  if (!basename || basename === '.' || basename === '..') {
    throw new TypeError('有効なファイル名を指定してください');
  }
  return basename.replace(/[\u0000-\u001f\u007f]/g, '-');
}

function getMimeType(filename) {
  const extension = path.extname(filename).toLowerCase();
  return {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
  }[extension] ?? 'application/octet-stream';
}

function buildCandidateWidths(originalWidth, options) {
  if (!originalWidth || originalWidth <= 0) return [options.maxWidth];
  const startWidth = Math.min(originalWidth, options.maxWidth);
  const minWidth = Math.min(startWidth, options.minWidth);
  const widths = [];

  for (let width = startWidth; width >= minWidth; width -= options.widthStep) {
    widths.push(width);
  }
  if (widths.at(-1) !== minWidth) widths.push(minWidth);
  return [...new Set(widths)];
}

async function encodeRaster(input, width, format, quality) {
  const pipeline = sharp(input)
    .rotate()
    .resize({ width, withoutEnlargement: true, fit: 'inside' });

  if (format === 'webp') {
    return pipeline.webp({ quality, effort: 6 }).toBuffer();
  }
  return pipeline.jpeg({ quality, mozjpeg: true, progressive: true }).toBuffer();
}

async function optimizeImage(input, filename, options = {}) {
  if (!Buffer.isBuffer(input)) throw new TypeError('inputはBufferで指定してください');
  if (input.length === 0) throw new TypeError('空の画像は処理できません');

  const safeFilename = sanitizeFilename(filename);
  const extension = path.extname(safeFilename).toLowerCase();
  if (!COPY_EXTENSIONS.has(extension) && !RASTER_EXTENSIONS.has(extension)) {
    throw new TypeError(`未対応の画像形式です: ${extension || '(拡張子なし)'}`);
  }

  if (COPY_EXTENSIONS.has(extension)) {
    return {
      buffer: input,
      filename: safeFilename,
      mimeType: getMimeType(safeFilename),
      optimized: false,
      originalBytes: input.length,
      outputBytes: input.length,
      width: null,
      quality: null,
      format: extension.slice(1),
      targetReached: input.length <= (options.targetBytes ?? DEFAULT_OPTIONS.targetBytes),
    };
  }

  const normalized = normalizeOptions(options);
  const metadata = await sharp(input).metadata();
  const format = extension === '.jpg' || extension === '.jpeg' ? 'jpeg' : 'webp';
  const outputExtension = format === 'jpeg' ? '.jpg' : '.webp';
  const outputFilename = `${path.parse(safeFilename).name}${outputExtension}`;
  const candidateWidths = buildCandidateWidths(metadata.width, normalized);
  let best = null;

  for (const width of candidateWidths) {
    for (const quality of normalized.qualitySteps) {
      const buffer = await encodeRaster(input, width, format, quality);
      if (!best || buffer.length < best.buffer.length) best = { buffer, width, quality };
      if (buffer.length <= normalized.targetBytes) {
        best = { buffer, width, quality };
        break;
      }
    }
    if (best && best.buffer.length <= normalized.targetBytes) break;
  }

  if (!best || best.buffer.length >= input.length) {
    return {
      buffer: input,
      filename: safeFilename,
      mimeType: getMimeType(safeFilename),
      optimized: false,
      originalBytes: input.length,
      outputBytes: input.length,
      width: metadata.width ?? null,
      quality: null,
      format: metadata.format ?? extension.slice(1),
      targetReached: input.length <= normalized.targetBytes,
    };
  }

  return {
    buffer: best.buffer,
    filename: outputFilename,
    mimeType: getMimeType(outputFilename),
    optimized: true,
    originalBytes: input.length,
    outputBytes: best.buffer.length,
    width: best.width,
    quality: best.quality,
    format,
    targetReached: best.buffer.length <= normalized.targetBytes,
  };
}

async function prepareWordPressUpload({ input, sourceFilename, uploadFilename, options }) {
  const requestedFilename = sanitizeFilename(uploadFilename ?? sourceFilename);
  const sourceExtension = path.extname(sanitizeFilename(sourceFilename));
  const requestedExtension = path.extname(requestedFilename);
  const conversionFilename = requestedExtension
    ? requestedFilename
    : `${requestedFilename}${sourceExtension}`;
  return optimizeImage(input, conversionFilename, options);
}

module.exports = {
  DEFAULT_OPTIONS,
  getMimeType,
  optimizeImage,
  prepareWordPressUpload,
  sanitizeFilename,
};
