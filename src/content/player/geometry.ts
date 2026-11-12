/** Where a video is on screen, and whether it is worth decorating. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function videoBox(video: HTMLVideoElement): Box | null {
  const r = video.getBoundingClientRect();
  if (r.width < 160 || r.height < 90) return null;
  if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return null;
  // The picture inside the element (object-fit: contain leaves bars).
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  const fit = getComputedStyle(video).objectFit;
  if (vw && vh && fit === 'contain') {
    const scale = Math.min(r.width / vw, r.height / vh);
    const w = vw * scale;
    const h = vh * scale;
    return { x: r.left + (r.width - w) / 2, y: r.top + (r.height - h) / 2, w, h };
  }
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

/** The element's own rectangle (controls live on it, not just on the picture). */
export function elementBox(video: HTMLVideoElement): Box {
  const r = video.getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height };
}

/** The part of `b` inside a `vw` × `vh` viewport (zero-size when it is off screen). */
export function visibleBox(b: Box, vw: number, vh: number): Box {
  const x = Math.max(0, b.x);
  const y = Math.max(0, b.y);
  return { x, y, w: Math.max(0, Math.min(vw, b.x + b.w) - x), h: Math.max(0, Math.min(vh, b.y + b.h) - y) };
}

export const inside = (b: Box, x: number, y: number) => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h;

/** clip-path that covers the viewport except a rounded hole at `b`. */
export function holePath(b: Box, vw: number, vh: number, r = 12, offsetX = 0, offsetY = 0): string {
  const x = b.x - offsetX;
  const y = b.y - offsetY;
  const rr = Math.min(r, b.w / 2, b.h / 2);
  const hole =
    `M${x + rr} ${y}H${x + b.w - rr}A${rr} ${rr} 0 0 1 ${x + b.w} ${y + rr}V${y + b.h - rr}` +
    `A${rr} ${rr} 0 0 1 ${x + b.w - rr} ${y + b.h}H${x + rr}A${rr} ${rr} 0 0 1 ${x} ${y + b.h - rr}` +
    `V${y + rr}A${rr} ${rr} 0 0 1 ${x + rr} ${y}Z`;
  return `path(evenodd,"M0 0H${vw}V${vh}H0Z${hole}")`;
}
