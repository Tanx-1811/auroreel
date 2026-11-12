/** A–B loop and the sleep timer, for the current video. */

export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

/** Plays the stretch between A and B over and over. */
export class ABLoop {
  a: number | null = null;
  b: number | null = null;
  private video: HTMLVideoElement | null = null;

  private onTime = () => {
    const v = this.video;
    if (!v || this.a === null || this.b === null) return;
    if (v.currentTime >= this.b || v.currentTime < this.a - 0.5) v.currentTime = this.a;
  };

  attach(v: HTMLVideoElement | null) {
    if (v === this.video) return;
    this.video?.removeEventListener('timeupdate', this.onTime);
    this.clear();
    this.video = v;
    v?.addEventListener('timeupdate', this.onTime);
  }

  setA(t: number) {
    this.a = t;
    if (this.b !== null && this.b <= t) this.b = null;
  }

  setB(t: number): boolean {
    if (this.a === null || t <= this.a + 0.3) return false;
    this.b = t;
    return true;
  }

  clear() {
    this.a = null;
    this.b = null;
  }
}

/** Pauses playback after a while, or when the current video ends (and keeps the next one from starting). */
export class SleepTimer {
  at: number | null = null;
  atEnd = false;
  private timer = 0;
  private holdUntil = 0;
  onFire: () => void = () => undefined;

  set(minutes: number | 'end' | null) {
    clearTimeout(this.timer);
    this.at = null;
    this.atEnd = false;
    if (minutes === 'end') this.atEnd = true;
    else if (typeof minutes === 'number' && minutes > 0) {
      this.at = Date.now() + minutes * 60_000;
      this.timer = window.setTimeout(() => this.fire(), minutes * 60_000);
    }
  }

  /** The current video ended: with "end of this video", pause what autoplays next. */
  ended() {
    if (!this.atEnd) return;
    this.fire();
  }

  /** Playback started: blocked for a few seconds after the timer fired (autoplay of the next video). */
  shouldBlock(): boolean {
    return Date.now() < this.holdUntil;
  }

  private fire() {
    this.at = null;
    this.atEnd = false;
    this.holdUntil = Date.now() + 15_000;
    this.onFire();
  }

  get state(): number | 'end' | null {
    return this.atEnd ? 'end' : this.at;
  }
}
