/** "Theme from this video": the current frame's colours become a theme, the frame its backdrop. */
import { paletteFromPixels } from '../../core/imagePalette.ts';
import { newThemeId, themeFromSeed, type Theme } from '../../core/themes.ts';

export type VideoThemeResult = Theme | 'protected' | 'not-ready';

export function themeFromVideo(v: HTMLVideoElement, name: string): VideoThemeResult {
  if (v.mediaKeys) return 'protected';
  if (v.readyState < 2 || !v.videoWidth) return 'not-ready';
  const scale = Math.min(1, 1280 / v.videoWidth);
  const big = document.createElement('canvas');
  big.width = Math.round(v.videoWidth * scale);
  big.height = Math.round(v.videoHeight * scale);
  const small = document.createElement('canvas');
  small.width = 64;
  small.height = Math.max(1, Math.round((64 * v.videoHeight) / v.videoWidth));
  try {
    big.getContext('2d')!.drawImage(v, 0, 0, big.width, big.height);
    const sctx = small.getContext('2d', { willReadFrequently: true })!;
    sctx.drawImage(v, 0, 0, small.width, small.height);
    const pal = paletteFromPixels(sctx.getImageData(0, 0, small.width, small.height).data);
    const image = big.toDataURL('image/webp', 0.8);
    if (!pal || !image.startsWith('data:image/webp')) return 'protected';
    const seeded = themeFromSeed({
      id: newThemeId(),
      name: name.slice(0, 40),
      mode: pal.mode,
      bg: pal.bg,
      accent: pal.accent,
      secondary: pal.secondary,
    });
    return {
      ...seeded,
      backdrop: { kind: 'image', image, blur: 18, veil: pal.mode === 'dark' ? 62 : 55, position: 'center' },
      glass: 45,
      createdAt: Date.now(),
    };
  } catch {
    return 'protected'; // a cross-origin video taints the canvas
  }
}
