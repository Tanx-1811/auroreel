/** File helpers for the studio (export / import / pictures). */

export function downloadJson(data: unknown, fileName: string) {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.replace(/[\\/:*?"<>|]+/g, ' ').trim();
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export function readFileText(file: File): Promise<string> {
  return file.text();
}

export interface LoadedPicture {
  /** WebP data URL, at most `maxSide` px on its longest side. */
  dataUrl: string;
  /** RGBA pixels of a 64 px copy (for picking colours). */
  pixels: Uint8ClampedArray;
}

/** Decodes a picture, shrinks it and re-encodes it as WebP for storage. */
export async function loadPicture(file: File, maxSide = 1920, maxChars = 2_800_000): Promise<LoadedPicture> {
  const bitmap = await createImageBitmap(file);
  let side = maxSide;
  let quality = 0.82;
  let dataUrl = '';
  for (let attempt = 0; attempt < 6; attempt++) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL('image/webp', quality);
    if (dataUrl.length <= maxChars) break;
    side = Math.round(side * 0.8);
    quality = Math.max(0.6, quality - 0.06);
  }
  const small = document.createElement('canvas');
  const s = 64 / Math.max(bitmap.width, bitmap.height);
  small.width = Math.max(1, Math.round(bitmap.width * s));
  small.height = Math.max(1, Math.round(bitmap.height * s));
  const ctx = small.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, small.width, small.height);
  const pixels = ctx.getImageData(0, 0, small.width, small.height).data;
  bitmap.close();
  return { dataUrl, pixels };
}
