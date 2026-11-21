export interface CompressionOptions {
  targetBytes?: number;
  maxWidth?: number;
  minWidth?: number;
  widthStep?: number;
  qualitySteps?: number[];
}

export type ConversionFormat = "jpeg" | "jpg" | "png" | "webp";

export interface ConversionOptions {
  quality?: number;
  background?: string;
}

export interface ConversionResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  originalBytes: number;
  outputBytes: number;
  width: number | null;
  height: number | null;
  format: "jpeg" | "png" | "webp";
}

export interface ColorReplacementOptions {
  sourceColor: string;
  targetColor: string;
  tolerance?: number;
  outputFormat?: ConversionFormat;
  background?: string;
}

export interface ColorReplacementResult extends ConversionResult {
  matchedPixels: number;
}

export interface CompressionResult {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  optimized: boolean;
  originalBytes: number;
  outputBytes: number;
  width: number | null;
  quality: number | null;
  format: string;
  targetReached: boolean;
}

export const DEFAULT_OPTIONS: Readonly<Required<CompressionOptions>>;
export function convertImage(
  input: Buffer,
  filename: string,
  outputFormat: ConversionFormat,
  options?: ConversionOptions,
): Promise<ConversionResult>;
export function getMimeType(filename: string): string;
export function replaceImageColor(
  input: Buffer,
  filename: string,
  options: ColorReplacementOptions,
): Promise<ColorReplacementResult>;
export function sanitizeFilename(filename: string): string;
export function optimizeImage(
  input: Buffer,
  filename: string,
  options?: CompressionOptions,
): Promise<CompressionResult>;
export function prepareWordPressUpload(input: {
  input: Buffer;
  sourceFilename: string;
  uploadFilename?: string;
  options?: CompressionOptions;
}): Promise<CompressionResult>;
