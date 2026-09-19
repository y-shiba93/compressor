export interface CompressionOptions {
  targetBytes?: number;
  maxWidth?: number;
  minWidth?: number;
  widthStep?: number;
  qualitySteps?: number[];
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
export function getMimeType(filename: string): string;
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
