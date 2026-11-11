/**
 * Ambient light: the video's colours glow around it. A tiny canvas is
 * redrawn from the video ~15 times a second and stretched, blurred and
 * saturated behind the page (z-index -1), so it shows wherever the page is
 * see-through. Page containers bigger than the video are made transparent
 * while the glow is on (and restored after). Protected (DRM) video can't be
 * drawn, so it gets a glow in the theme accent instead.
 */
import { elementBox, holePath, type Box } from './geometry.ts';

export interface AmbientOptions {
  intensity: number;
  blur: number;
  spread: number;
  accent: string;
}

const W = 64;
const H = 36;

export class Ambient {
  private canvas = document.createElement('canvas');
  private ctx = this.canvas.getContext('2d', { alpha: true, willReadFrequently: false });
  private video: HTMLVideoElement | null = null;
  private raf = 0;
  private last = 0;
  private opts: AmbientOptions = { intensity: 70, blur: 70, spread: 12, accent: '#8b5cf6' };
  private cleared: { el: HTMLElement; value: string; priority: string }[] = [];
  private htmlBg: { value: string; priority: string } | null = null;
  private clearTimer = 0;
  private cinemaHole = false;
  on = false;

  constructor() {
    this.canvas.width = W;
    this.canvas.height = H;
    this.canvas.dataset.reelskin = 'ambient';
    this.canvas.setAttribute('aria-hidden', 'true');
    Object.assign(this.canvas.style, {
      position: 'fixed',
      zIndex: '-1',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity .5s ease',
      left: '0',
      top: '0',
      width: '0',
      height: '0',
    } satisfies Partial<CSSStyleDeclaration>);
  }

  configure(opts: AmbientOptions) {
    this.opts = opts;
    this.canvas.style.filter = `blur(${opts.blur}px) saturate(1.5) brightness(1.05)`;
    if (this.on) this.canvas.style.opacity = String(opts.intensity / 100);
  }

  setVideo(video: HTMLVideoElement | null) {
    this.video = video;
    if (this.on) this.clearBackgrounds();
  }

  /** In cinema mode the glow sits above the dimmed page, with a hole for the video. */
  setCinema(active: boolean) {
    this.cinemaHole = active;
    this.canvas.style.zIndex = active ? '2147483001' : '-1';
    if (!active) this.canvas.style.clipPath = '';
  }

  enable() {
    if (this.on) return;
    this.on = true;
    document.documentElement.classList.add('rs-ambient');
    (document.body ?? document.documentElement).append(this.canvas);
    this.clearBackgrounds();
    // Single-page sites re-render their containers; keep them see-through.
    this.clearTimer = window.setInterval(() => this.clearBackgrounds(), 2500);
    requestAnimationFrame(() => (this.canvas.style.opacity = String(this.opts.intensity / 100)));
    this.loop();
  }

  disable() {
    if (!this.on) return;
    this.on = false;
    cancelAnimationFrame(this.raf);
    clearInterval(this.clearTimer);
    document.documentElement.classList.remove('rs-ambient');
    this.canvas.style.opacity = '0';
    setTimeout(() => {
      if (!this.on) this.canvas.remove();
    }, 500);
    this.restoreBackgrounds();
  }

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const v = this.video;
    if (!v || !v.isConnected) {
      this.canvas.style.width = '0';
      return;
    }
    const b = elementBox(v);
    if (b.w < 160 || b.h < 90 || document.fullscreenElement) {
      this.canvas.style.width = '0';
      return;
    }
    this.place(b);
    const now = performance.now();
    if (now - this.last < 66) return;
    if (v.paused && this.last && now - this.last < 1000) return;
    this.last = now;
    this.draw(v);
  };

  private place(b: Box) {
    const k = this.opts.spread / 100;
    const x = b.x - b.w * k;
    const y = b.y - b.h * k;
    const w = b.w * (1 + 2 * k);
    const h = b.h * (1 + 2 * k);
    const s = this.canvas.style;
    s.left = `${x}px`;
    s.top = `${y}px`;
    s.width = `${w}px`;
    s.height = `${h}px`;
    if (this.cinemaHole) {
      s.clipPath = holePath(b, w, h, 14, x, y);
    }
  }

  private draw(v: HTMLVideoElement) {
    const ctx = this.ctx;
    if (!ctx) return;
    if (v.mediaKeys || v.readyState < 2) {
      // Protected or not ready: an accent glow instead of the picture.
      const g = ctx.createRadialGradient(W / 2, H / 2, 2, W / 2, H / 2, W / 1.6);
      g.addColorStop(0, this.opts.accent);
      g.addColorStop(1, 'transparent');
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      return;
    }
    try {
      ctx.drawImage(v, 0, 0, W, H);
    } catch {
      // Some players throw while switching sources; try again next frame.
    }
  }

  /**
   * Makes page containers around the video transparent so the glow can show,
   * painting their colour on <html> instead. Only elements clearly bigger than
   * the video (page-level containers) are touched.
   */
  private clearBackgrounds() {
    const v = this.video;
    if (!v) return;
    const vb = elementBox(v);
    const videoArea = Math.max(1, vb.w * vb.h);
    let pageColor: string | null = null;
    for (let node = v.parentElement; node && node !== document.documentElement; node = node.parentElement) {
      const cs = getComputedStyle(node);
      const bg = cs.backgroundColor;
      if (!bg || bg === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(bg) || cs.backgroundImage !== 'none') continue;
      const r = node.getBoundingClientRect();
      if (r.width * r.height < videoArea * 1.6) continue;
      if (this.cleared.some((c) => c.el === node)) continue;
      pageColor ??= bg;
      this.cleared.push({
        el: node,
        value: node.style.getPropertyValue('background-color'),
        priority: node.style.getPropertyPriority('background-color'),
      });
      node.style.setProperty('background-color', 'transparent', 'important');
    }
    const html = document.documentElement;
    const htmlBg = getComputedStyle(html).backgroundColor;
    if (pageColor && !this.htmlBg && (htmlBg === 'transparent' || /,\s*0\)$/.test(htmlBg))) {
      this.htmlBg = {
        value: html.style.getPropertyValue('background-color'),
        priority: html.style.getPropertyPriority('background-color'),
      };
      html.style.setProperty('background-color', pageColor, 'important');
    }
  }

  private restoreBackgrounds() {
    for (const { el, value, priority } of this.cleared) {
      if (value) el.style.setProperty('background-color', value, priority);
      else el.style.removeProperty('background-color');
    }
    this.cleared = [];
    if (this.htmlBg) {
      const html = document.documentElement;
      if (this.htmlBg.value) html.style.setProperty('background-color', this.htmlBg.value, this.htmlBg.priority);
      else html.style.removeProperty('background-color');
      this.htmlBg = null;
    }
  }
}
