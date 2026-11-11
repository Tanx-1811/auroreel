/** Saves the current video frame as an image file. */

export type CaptureResult = 'saved' | 'protected' | 'not-ready';

function safeName(title: string): string {
  const base =
    title
      .replace(/[\\/:*?"<>|\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 80) || 'video';
  return base;
}

function stamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}-${pad(m)}-${pad(s % 60)}` : `${pad(m)}-${pad(s % 60)}`;
}

export async function captureFrame(video: HTMLVideoElement, format: 'png' | 'jpeg'): Promise<CaptureResult> {
  if (video.mediaKeys) return 'protected';
  if (video.readyState < 2 || !video.videoWidth) return 'not-ready';
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 'not-ready';
  ctx.drawImage(video, 0, 0);
  let blob: Blob | null;
  try {
    blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, format === 'png' ? 'image/png' : 'image/jpeg', 0.92),
    );
  } catch {
    return 'protected'; // cross-origin video without CORS taints the canvas
  }
  if (!blob) return 'protected';
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeName(document.title)} ${stamp(video.currentTime)}.${format === 'png' ? 'png' : 'jpg'}`;
  a.style.display = 'none';
  (document.body ?? document.documentElement).append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
  return 'saved';
}
