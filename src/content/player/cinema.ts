/**
 * Cinema mode: everything but the video goes dark. A fixed overlay covers the
 * page with a rounded hole over the player; the hole is cut with clip-path,
 * which also lets clicks through to the player's own controls. Clicking the
 * dark area or pressing Esc turns it off.
 */
import { elementBox, holePath } from './geometry.ts';

export class Cinema {
  private overlay = document.createElement('div');
  private video: HTMLVideoElement | null = null;
  private raf = 0;
  private lastPath = '';
  on = false;
  onExit: () => void = () => undefined;

  constructor() {
    this.overlay.dataset.auroreel = 'cinema';
    this.overlay.setAttribute('aria-hidden', 'true');
    Object.assign(this.overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483000',
      background: '#000',
      opacity: '0',
      transition: 'opacity .35s ease',
      cursor: 'zoom-out',
    } satisfies Partial<CSSStyleDeclaration>);
    this.overlay.addEventListener('click', () => this.onExit());
  }

  setDim(dim: number) {
    if (this.on) this.overlay.style.opacity = String(dim / 100);
    this.overlay.dataset.dim = String(dim);
  }

  setVideo(video: HTMLVideoElement | null) {
    this.video = video;
  }

  enable(dim: number) {
    if (this.on) return;
    this.on = true;
    this.overlay.dataset.dim = String(dim);
    (document.body ?? document.documentElement).append(this.overlay);
    this.track();
    requestAnimationFrame(() => (this.overlay.style.opacity = String(dim / 100)));
  }

  disable() {
    if (!this.on) return;
    this.on = false;
    cancelAnimationFrame(this.raf);
    this.overlay.style.opacity = '0';
    setTimeout(() => {
      if (!this.on) this.overlay.remove();
    }, 350);
  }

  private track = () => {
    this.raf = requestAnimationFrame(this.track);
    const v = this.video;
    let path = 'none';
    if (v?.isConnected && !document.fullscreenElement) {
      const b = elementBox(v);
      if (b.w > 0 && b.h > 0) path = holePath(b, innerWidth, innerHeight, 12);
    }
    if (path !== this.lastPath) {
      this.lastPath = path;
      this.overlay.style.clipPath = path;
    }
  };
}
