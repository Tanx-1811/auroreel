/**
 * Volume boost above 100 % with Web Audio. A media element can be routed
 * through an AudioContext only once and only when its audio is readable
 * (same origin, CORS, or a MediaSource stream — what YouTube, Twitch and the
 * streaming sites use); otherwise the browser would play silence, so those
 * videos are skipped. The context is only created when it can start (after a
 * user gesture), never leaving a video muted.
 */
declare const __RS_E2E__: boolean;

interface Graph {
  ctx: AudioContext;
  gain: GainNode;
}

export type BoostResult = 'ok' | 'unsupported' | 'needs-gesture';

export class VolumeBoost {
  private graphs = new WeakMap<HTMLVideoElement, Graph>();

  private readable(v: HTMLVideoElement): boolean {
    const src = v.currentSrc || v.src;
    if (!src || src.startsWith('blob:') || src.startsWith('data:')) return true;
    try {
      return new URL(src, location.href).origin === location.origin || v.crossOrigin !== null;
    } catch {
      return false;
    }
  }

  /** Applies `percent` (100–300) to the video. */
  async apply(v: HTMLVideoElement, percent: number): Promise<BoostResult> {
    const existing = this.graphs.get(v);
    if (existing) {
      existing.gain.gain.value = percent / 100;
      if (__RS_E2E__) v.dataset.rsBoost = String(percent);
      if (existing.ctx.state === 'suspended') await existing.ctx.resume().catch(() => undefined);
      return 'ok';
    }
    if (percent <= 100) return 'ok';
    if (!this.readable(v) || v.mediaKeys) return 'unsupported';
    const ctx = new AudioContext();
    await ctx.resume().catch(() => undefined);
    if (ctx.state !== 'running') {
      void ctx.close();
      return 'needs-gesture';
    }
    try {
      const source = ctx.createMediaElementSource(v);
      const gain = ctx.createGain();
      gain.gain.value = percent / 100;
      source.connect(gain).connect(ctx.destination);
      this.graphs.set(v, { ctx, gain });
      if (__RS_E2E__) v.dataset.rsBoost = String(percent);
      return 'ok';
    } catch {
      void ctx.close();
      return 'unsupported';
    }
  }

  has(v: HTMLVideoElement) {
    return this.graphs.has(v);
  }
}
