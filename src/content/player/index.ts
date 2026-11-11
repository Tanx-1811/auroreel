/**
 * Player tools on any page with a video: a floating toolbar (speed, picture
 * filters, ambient light, cinema mode, loop, frame capture, picture in
 * picture), on-page shortcuts and toasts. The UI lives in a closed-off
 * shadow root; the page's own player is never modified beyond the <video>
 * element's playbackRate, loop and filter.
 */
import {
  FILTER_KEYS,
  FILTER_LIMITS,
  FILTER_PRESETS,
  FILTER_PRESET_IDS,
  filterCss,
  matchPreset,
  type FilterValues,
} from '../../core/filters.ts';
import type { PlatformId } from '../../core/platforms.ts';
import { SPEED_MAX, SPEED_MIN, type PlayerSettings, type Settings } from '../../core/settings.ts';
import { ACTION_IDS, formatShortcut, matches, type ActionId } from '../../core/shortcuts.ts';
import { translate, type Lang, type MessageKey, type Vars } from '../../shared/i18n.ts';
import type { PageAction, PageStatus } from '../../shared/messages.ts';
import { loadSpeeds, saveSpeed, updateSettings } from '../../shared/storage.ts';
import { Ambient } from './ambient.ts';
import { captureFrame } from './capture.ts';
import { Cinema } from './cinema.ts';
import { el, icon, ICONS } from './dom.ts';
import { elementBox, inside } from './geometry.ts';
import { UI_CSS } from './ui-css.ts';

declare const __RS_E2E__: boolean;

export interface PlayerConfig {
  settings: PlayerSettings;
  shortcuts: Settings['shortcuts'];
  shortcutsOn: boolean;
  /** Tools switched on for this site. */
  on: boolean;
  accent: string;
  accentText: string;
  lang: Lang;
  platform: PlatformId;
}

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);
const round2 = (n: number) => Math.round(n * 100) / 100;

function isTyping(e: Event): boolean {
  const t = (e.composedPath()[0] ?? e.target) as HTMLElement | null;
  if (!t || !(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') {
    const type = (t as HTMLInputElement).type;
    return !['button', 'checkbox', 'radio', 'range', 'submit', 'reset', 'color', 'file', 'image'].includes(type);
  }
  return false;
}

export class PlayerTools {
  private cfg: PlayerConfig | null = null;
  private host = el('reelskin-ui' as 'div');
  private root = this.host.attachShadow({ mode: __RS_E2E__ ? 'open' : 'closed' });
  private bar = el('div', { class: 'bar', role: 'toolbar' });
  private panel = el('div', { class: 'panel', role: 'dialog' });
  private toastEl = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
  private tip = el('div', { class: 'tip', role: 'tooltip' });
  private buttons = new Map<string, HTMLButtonElement>();
  private speedLabel = el('button', { class: 'speed' });
  private video: HTMLVideoElement | null = null;
  private ambient = new Ambient();
  private cinema = new Cinema();
  private started = false;
  private barVisible = false;
  private overUi = false;
  private hideTimer = 0;
  private toastTimer = 0;
  private pickTimer = 0;
  private saveTimer = 0;
  private sourceSeen = new WeakMap<HTMLVideoElement, string>();
  private filtered = new WeakSet<HTMLVideoElement>();
  private speeds: Partial<Record<PlatformId, number>> = {};
  private panelOpen = false;
  private sliders = new Map<keyof FilterValues, { input: HTMLInputElement; out: HTMLOutputElement }>();
  private presetChips = new Map<string, HTMLButtonElement>();
  private filterSwitch = el('button', { class: 'switch', role: 'switch' }, el('i'));
  private observer: MutationObserver | null = null;
  /** Theme paused in this tab (Alt+T); owned by the content script. */
  onToggleSkin: () => void = () => undefined;
  skinPaused = () => false;

  constructor() {
    this.host.dataset.reelskin = 'ui';
    const style = el('style', { text: UI_CSS });
    this.root.append(style, this.bar, this.panel, this.toastEl, this.tip);
    this.cinema.onExit = () => this.setCinema(false);
    for (const node of [this.bar, this.panel]) {
      node.addEventListener('pointerenter', () => (this.overUi = true));
      node.addEventListener('pointerleave', () => {
        this.overUi = false;
        this.scheduleHide(1200);
      });
      // Keep clicks and keys inside the toolbar away from the site's player.
      for (const type of [
        'click',
        'mousedown',
        'mouseup',
        'pointerdown',
        'pointerup',
        'dblclick',
        'keydown',
        'wheel',
      ]) {
        node.addEventListener(type, (e) => e.stopPropagation());
      }
    }
  }

  private t = (key: MessageKey, vars?: Vars) => translate(this.cfg?.lang ?? 'en', key, vars);

  configure(cfg: PlayerConfig) {
    const first = !this.cfg;
    const prev = this.cfg;
    this.cfg = cfg;
    this.host.style.setProperty('--acc', cfg.accent);
    this.host.style.setProperty('--acc-text', cfg.accentText);
    if (!cfg.on) {
      this.teardown();
      return;
    }
    if (!this.started) this.start();
    const keysChanged =
      prev?.shortcutsOn !== cfg.shortcutsOn || JSON.stringify(prev?.shortcuts) !== JSON.stringify(cfg.shortcuts);
    if (first || prev?.lang !== cfg.lang || keysChanged) this.buildBar();
    this.buildPanel();
    this.applyFilters();
    this.ambient.configure({ ...cfg.settings.ambient, accent: cfg.accent });
    if (cfg.settings.ambient.enabled) this.ambient.enable();
    else this.ambient.disable();
    this.cinema.setDim(cfg.settings.cinema.dim);
    this.refreshButtons();
    this.position();
  }

  status(): Omit<PageStatus, 'platform' | 'skinPaused'> {
    this.pick();
    return {
      hasVideo: !!this.video,
      speed: this.video ? round2(this.video.playbackRate) : 1,
      cinema: this.cinema.on,
      loop: !!this.video?.loop,
    };
  }

  // ——— Lifecycle ———

  private start() {
    this.started = true;
    void loadSpeeds().then((s) => (this.speeds = s));
    (document.body ?? document.documentElement).append(this.host);
    document.addEventListener('play', this.onPlay, true);
    document.addEventListener('loadedmetadata', this.onMeta, true);
    document.addEventListener('ratechange', this.onRate, true);
    document.addEventListener('pointermove', this.onPointer, { passive: true, capture: true });
    window.addEventListener('keydown', this.onKey, true);
    window.addEventListener('scroll', this.onViewport, { passive: true, capture: true });
    window.addEventListener('resize', this.onViewport, { passive: true });
    document.addEventListener('fullscreenchange', this.onFullscreen);
    this.observer = new MutationObserver(() => {
      clearTimeout(this.pickTimer);
      this.pickTimer = window.setTimeout(() => this.pick(), 600);
    });
    this.observer.observe(document.documentElement, { childList: true, subtree: true });
    this.pick();
  }

  private teardown() {
    if (!this.started) return;
    this.started = false;
    document.removeEventListener('play', this.onPlay, true);
    document.removeEventListener('loadedmetadata', this.onMeta, true);
    document.removeEventListener('ratechange', this.onRate, true);
    document.removeEventListener('pointermove', this.onPointer, true);
    window.removeEventListener('keydown', this.onKey, true);
    window.removeEventListener('scroll', this.onViewport, true);
    window.removeEventListener('resize', this.onViewport);
    document.removeEventListener('fullscreenchange', this.onFullscreen);
    this.observer?.disconnect();
    this.ambient.disable();
    this.setCinema(false, true);
    for (const v of document.querySelectorAll('video')) this.clearFilter(v);
    this.host.remove();
    this.video = null;
  }

  // ——— Choosing the video ———

  private pick() {
    if (this.video?.isConnected && this.visible(this.video)) return;
    let best: HTMLVideoElement | null = null;
    let area = 0;
    for (const v of document.querySelectorAll('video')) {
      if (!this.visible(v)) continue;
      const b = elementBox(v);
      const a = b.w * b.h;
      if (a > area) {
        area = a;
        best = v;
      }
    }
    this.setVideo(best);
  }

  private visible(v: HTMLVideoElement) {
    const b = elementBox(v);
    return b.w >= 200 && b.h >= 112 && b.y + b.h > 0 && b.y < innerHeight;
  }

  private setVideo(v: HTMLVideoElement | null) {
    if (v === this.video) return;
    if (this.video) this.clearFilter(this.video);
    this.video = v;
    this.ambient.setVideo(v);
    this.cinema.setVideo(v);
    if (v) {
      this.applyFilters();
      this.applyStartSpeed(v);
    } else {
      this.showBar(false);
      if (this.cinema.on) this.setCinema(false);
    }
    this.refreshButtons();
  }

  private onPlay = (e: Event) => {
    const v = e.target;
    if (!(v instanceof HTMLVideoElement) || !this.visible(v)) return;
    this.setVideo(v);
    if (this.cfg?.settings.cinema.auto && !this.cinema.on) this.setCinema(true, true);
  };

  private onMeta = (e: Event) => {
    const v = e.target;
    if (v instanceof HTMLVideoElement && v === this.video) this.applyStartSpeed(v);
  };

  private onRate = (e: Event) => {
    if (e.target === this.video) this.refreshButtons();
  };

  /** New source: start at the remembered or default speed. */
  private applyStartSpeed(v: HTMLVideoElement) {
    const cfg = this.cfg;
    if (!cfg) return;
    const src = v.currentSrc || v.src;
    if (!src || this.sourceSeen.get(v) === src) return;
    this.sourceSeen.set(v, src);
    const target = (cfg.settings.speed.remember ? this.speeds[cfg.platform] : undefined) ?? cfg.settings.speed.default;
    if (target !== 1 && Math.abs(v.playbackRate - target) > 0.001) {
      v.playbackRate = target;
    }
  }

  // ——— Toolbar ———

  private button(id: string, label: string, content: Node, onClick: () => void, pressed?: boolean): HTMLButtonElement {
    const b = el('button', { 'aria-label': label, 'data-id': id }, content);
    if (pressed !== undefined) b.setAttribute('aria-pressed', String(pressed));
    b.addEventListener('click', onClick);
    b.addEventListener('pointerenter', () => this.showTip(b, label));
    b.addEventListener('pointerleave', () => this.tip.classList.remove('show'));
    b.addEventListener('focus', () => this.showTip(b, label));
    b.addEventListener('blur', () => this.tip.classList.remove('show'));
    this.buttons.set(id, b);
    return b;
  }

  private label(key: MessageKey, action: ActionId) {
    const sc = this.cfg?.shortcutsOn ? this.cfg.shortcuts[action] : null;
    return sc ? `${this.t(key)} (${formatShortcut(sc, IS_MAC)})` : this.t(key);
  }

  private buildBar() {
    this.bar.replaceChildren();
    this.buttons.clear();
    this.bar.setAttribute('aria-label', 'Reelskin');
    this.speedLabel = this.button(
      'speed',
      this.label('page.speedReset', 'speedReset'),
      document.createTextNode('1×'),
      () => this.setSpeed(1),
    );
    this.speedLabel.classList.add('speed');
    this.bar.append(
      this.button('slower', this.label('page.slower', 'speedDown'), icon(ICONS.minus, 16), () => this.stepSpeed(-1)),
      this.speedLabel,
      this.button('faster', this.label('page.faster', 'speedUp'), icon(ICONS.plus, 16), () => this.stepSpeed(1)),
      el('span', { class: 'sep' }),
      this.button(
        'filters',
        this.label('page.filters', 'filters'),
        icon(ICONS.filters),
        () => this.togglePanel(),
        false,
      ),
      this.button(
        'ambient',
        this.label('page.ambient', 'ambient'),
        icon(ICONS.ambient),
        () => this.toggleAmbient(),
        false,
      ),
      this.button(
        'cinema',
        this.label('page.cinema', 'cinema'),
        icon(ICONS.cinema),
        () => this.setCinema(!this.cinema.on),
        false,
      ),
      this.button('loop', this.label('page.loop', 'loop'), icon(ICONS.loop), () => this.toggleLoop(), false),
      this.button(
        'screenshot',
        this.label('page.screenshot', 'screenshot'),
        icon(ICONS.camera),
        () => void this.screenshot(),
      ),
      this.button('pip', this.label('page.pip', 'pip'), icon(ICONS.pip), () => void this.pip()),
    );
  }

  private refreshButtons() {
    const v = this.video;
    const cfg = this.cfg;
    if (!cfg) return;
    this.speedLabel.textContent = `${round2(v?.playbackRate ?? 1)}×`;
    this.buttons.get('ambient')?.setAttribute('aria-pressed', String(cfg.settings.ambient.enabled));
    this.buttons.get('cinema')?.setAttribute('aria-pressed', String(this.cinema.on));
    this.buttons.get('loop')?.setAttribute('aria-pressed', String(!!v?.loop));
    this.buttons.get('filters')?.setAttribute('aria-pressed', String(this.panelOpen || cfg.settings.filtersOn));
  }

  private showTip(target: HTMLElement, text: string) {
    this.tip.textContent = text;
    const r = target.getBoundingClientRect();
    this.tip.classList.add('show');
    const tw = this.tip.offsetWidth;
    this.tip.style.left = `${Math.max(6, Math.min(innerWidth - tw - 6, r.left + r.width / 2 - tw / 2))}px`;
    this.tip.style.top = `${r.bottom + 8}px`;
  }

  private onPointer = (e: PointerEvent) => {
    const v = this.video;
    if (!v || !this.cfg?.settings.toolbar) return;
    if (inside(elementBox(v), e.clientX, e.clientY)) {
      this.showBar(true);
      this.scheduleHide(2600);
    } else if (!this.overUi && !this.panelOpen) this.scheduleHide(500);
  };

  private onViewport = () => {
    if (this.barVisible || this.panelOpen) this.position();
  };

  private onFullscreen = () => {
    const fs = document.fullscreenElement;
    const parent = fs && !(fs instanceof HTMLVideoElement) && this.video && fs.contains(this.video) ? fs : null;
    (parent ?? document.body ?? document.documentElement).append(this.host);
    this.position();
  };

  private scheduleHide(ms: number) {
    clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => {
      if (this.overUi || this.panelOpen) return;
      this.showBar(false);
    }, ms);
  }

  private showBar(show: boolean) {
    if (show && (!this.video || !this.cfg?.settings.toolbar || elementBox(this.video).w < 300)) show = false;
    this.barVisible = show;
    this.bar.classList.toggle('show', show);
    if (!show) this.tip.classList.remove('show');
    if (show) this.position();
  }

  private position() {
    const v = this.video;
    if (!v || !this.cfg) return;
    const b = elementBox(v);
    const right = this.cfg.settings.toolbarSide === 'right';
    const bw = this.bar.offsetWidth || 340;
    const top = Math.max(8, b.y + 12);
    const left = right ? b.x + b.w - bw - 12 : b.x + 12;
    this.bar.style.top = `${top}px`;
    this.bar.style.left = `${Math.max(8, Math.min(innerWidth - bw - 8, left))}px`;
    if (this.panelOpen) {
      const pw = this.panel.offsetWidth || 300;
      const pLeft = right ? b.x + b.w - pw - 12 : b.x + 12;
      this.panel.style.top = `${top + 44}px`;
      this.panel.style.left = `${Math.max(8, Math.min(innerWidth - pw - 8, pLeft))}px`;
    }
  }

  private toast(text: string, big?: string) {
    this.toastEl.replaceChildren();
    if (big)
      this.toastEl.append(el('span', { class: 'big', text: big }), document.createTextNode(text ? `  ${text}` : ''));
    else this.toastEl.textContent = text;
    const v = this.video;
    const b = v ? elementBox(v) : { x: 0, y: 0, w: innerWidth, h: innerHeight };
    this.toastEl.style.left = `${Math.min(innerWidth - 20, Math.max(20, b.x + b.w / 2))}px`;
    this.toastEl.style.top = `${Math.max(12, b.y + Math.min(64, b.h * 0.12))}px`;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), 1400);
  }

  // ——— Filters panel ———

  private buildPanel() {
    const cfg = this.cfg!;
    if (!this.panel.childElementCount || this.panel.dataset.lang !== cfg.lang) {
      this.panel.dataset.lang = cfg.lang;
      this.panel.replaceChildren();
      this.sliders.clear();
      this.presetChips.clear();
      this.panel.setAttribute('aria-label', this.t('page.filters'));
      const close = el('button', { 'aria-label': this.t('common.close') }, icon(ICONS.close, 16));
      close.addEventListener('click', () => this.togglePanel(false));
      this.filterSwitch = el('button', { class: 'switch', role: 'switch' }, el('i'), this.t('page.filtersSwitch'));
      this.filterSwitch.addEventListener('click', () => this.persist((s) => ({ ...s, filtersOn: !s.filtersOn }), 0));
      const chips = el('div', { class: 'chips' });
      for (const id of FILTER_PRESET_IDS) {
        const chip = el('button', { class: 'chip', text: this.t(`preset.${id}` as MessageKey) });
        chip.addEventListener('click', () =>
          this.persist((s) => ({ ...s, filtersOn: true, filters: { ...FILTER_PRESETS[id] } }), 0),
        );
        this.presetChips.set(id, chip);
        chips.append(chip);
      }
      const rows = FILTER_KEYS.map((k) => {
        const lim = FILTER_LIMITS[k];
        const id = `rs-f-${k}`;
        const input = el('input', { id, type: 'range', min: lim.min, max: lim.max, step: lim.step });
        const out = el('output', { for: id });
        input.addEventListener('input', () => {
          const value = Number(input.value);
          this.setSlider(k, value);
          this.persist((s) => ({ ...s, filtersOn: true, filters: { ...s.filters, [k]: value } }), 250);
        });
        this.sliders.set(k, { input, out });
        return el(
          'div',
          { class: 'row' },
          el('label', { for: id, text: this.t(`filter.${k}` as MessageKey) }),
          input,
          out,
        );
      });
      const reset = el('button', { class: 'text-btn', text: this.t('common.reset') });
      reset.addEventListener('click', () => this.persist((s) => ({ ...s, filters: { ...FILTER_PRESETS.natural } }), 0));
      this.panel.append(
        el('h3', {}, el('span', { text: this.t('page.filters') }), close),
        chips,
        ...rows,
        el('div', { class: 'foot' }, this.filterSwitch, reset),
      );
    }
    const f = cfg.settings.filters;
    for (const k of FILTER_KEYS) this.setSlider(k, f[k]);
    const preset = matchPreset(f);
    for (const [id, chip] of this.presetChips)
      chip.setAttribute('aria-pressed', String(cfg.settings.filtersOn && id === preset));
    this.filterSwitch.setAttribute('aria-checked', String(cfg.settings.filtersOn));
  }

  private setSlider(k: keyof FilterValues, value: number) {
    const s = this.sliders.get(k);
    if (!s) return;
    const lim = FILTER_LIMITS[k];
    if (document.activeElement !== this.host || this.root.activeElement !== s.input) s.input.value = String(value);
    s.input.style.setProperty('--pct', `${((value - lim.min) / (lim.max - lim.min)) * 100}%`);
    s.out.textContent = `${value}${lim.unit}`;
  }

  private togglePanel(open = !this.panelOpen) {
    this.panelOpen = open;
    this.panel.classList.toggle('show', open);
    if (open) {
      this.showBar(true);
      this.position();
    } else this.scheduleHide(1500);
    this.refreshButtons();
  }

  private persist(fn: (p: PlayerSettings) => PlayerSettings, delay: number) {
    // Apply right away on this page; storage follows (and reaches other tabs).
    if (this.cfg) {
      this.cfg = { ...this.cfg, settings: fn(this.cfg.settings) };
      this.applyFilters();
      this.buildPanel();
      this.refreshButtons();
    }
    clearTimeout(this.saveTimer);
    const save = () => void updateSettings((s) => ({ ...s, player: fn(s.player) })).catch(() => undefined);
    if (delay) this.saveTimer = window.setTimeout(save, delay);
    else save();
  }

  private applyFilters() {
    const v = this.video;
    const cfg = this.cfg;
    if (!v || !cfg) return;
    const css = cfg.settings.filtersOn ? filterCss(cfg.settings.filters) : '';
    if (css) {
      v.style.setProperty('filter', css, 'important');
      this.filtered.add(v);
    } else this.clearFilter(v);
  }

  private clearFilter(v: HTMLVideoElement) {
    if (!this.filtered.has(v)) return;
    v.style.removeProperty('filter');
    this.filtered.delete(v);
  }

  // ——— Actions ———

  run(action: PageAction | ActionId) {
    if (action === 'toggleSkin') {
      this.onToggleSkin();
      this.toast(this.t(this.skinPaused() ? 'page.skinOff' : 'page.skinOn'));
      return;
    }
    this.pick();
    const v = this.video;
    if (!v) return;
    switch (action) {
      case 'speedUp':
        return this.stepSpeed(1);
      case 'speedDown':
        return this.stepSpeed(-1);
      case 'speedReset':
        return this.setSpeed(1);
      case 'rewind':
        v.currentTime = Math.max(0, v.currentTime - 10);
        return this.toast(this.t('page.rewind'));
      case 'advance':
        v.currentTime = Math.min(v.duration || Infinity, v.currentTime + 10);
        return this.toast(this.t('page.advance'));
      case 'cinema':
        return this.setCinema(!this.cinema.on);
      case 'ambient':
        return this.toggleAmbient();
      case 'filters':
        this.persist((s) => ({ ...s, filtersOn: !s.filtersOn }), 0);
        return this.toast(this.t(this.cfg?.settings.filtersOn ? 'page.filtersOn' : 'page.filtersOff'));
      case 'loop':
        return this.toggleLoop();
      case 'screenshot':
        return void this.screenshot();
      case 'pip':
        return void this.pip();
    }
  }

  private onKey = (e: KeyboardEvent) => {
    const cfg = this.cfg;
    if (!cfg?.on || !cfg.shortcutsOn || e.defaultPrevented || e.repeat || isTyping(e)) return;
    const action = ACTION_IDS.find((id) => matches(cfg.shortcuts[id], e));
    if (!action) return;
    if (action !== 'toggleSkin') {
      this.pick();
      if (!this.video) return;
    }
    e.preventDefault();
    e.stopImmediatePropagation();
    this.run(action);
  };

  private stepSpeed(dir: 1 | -1) {
    const v = this.video;
    const step = this.cfg?.settings.speed.step ?? 0.25;
    if (!v) return;
    const next = Math.round((v.playbackRate + dir * step) / step) * step;
    this.setSpeed(next);
  }

  private setSpeed(rate: number) {
    const v = this.video;
    const cfg = this.cfg;
    if (!v || !cfg) return;
    const r = round2(Math.min(SPEED_MAX, Math.max(SPEED_MIN, rate)));
    v.playbackRate = r;
    this.toast(this.t('page.speed'), `${r}×`);
    this.refreshButtons();
    if (cfg.settings.speed.remember) {
      this.speeds[cfg.platform] = r;
      void saveSpeed(cfg.platform, r).catch(() => undefined);
    }
  }

  setCinema(on: boolean, quiet = false) {
    if (!this.cfg) return;
    if (on) {
      this.pick();
      if (!this.video) return;
      this.cinema.enable(this.cfg.settings.cinema.dim);
      document.addEventListener('keydown', this.onEsc, true);
    } else {
      this.cinema.disable();
      document.removeEventListener('keydown', this.onEsc, true);
    }
    this.ambient.setCinema(on);
    this.refreshButtons();
    if (!quiet) this.toast(this.t(on ? 'page.cinemaOn' : 'page.cinemaOff'));
  }

  private onEsc = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.cinema.on && !document.fullscreenElement) this.setCinema(false);
  };

  private toggleAmbient() {
    const on = !this.cfg?.settings.ambient.enabled;
    this.persist((s) => ({ ...s, ambient: { ...s.ambient, enabled: on } }), 0);
    if (on) this.ambient.enable();
    else this.ambient.disable();
    this.toast(this.t(on ? 'page.ambientOn' : 'page.ambientOff'));
  }

  private toggleLoop() {
    const v = this.video;
    if (!v) return;
    v.loop = !v.loop;
    this.refreshButtons();
    this.toast(this.t(v.loop ? 'page.loopOn' : 'page.loopOff'));
  }

  private async screenshot() {
    const v = this.video;
    if (!v || !this.cfg) return;
    const result = await captureFrame(v, this.cfg.settings.screenshotFormat);
    this.toast(this.t(result === 'saved' ? 'page.saved' : result === 'protected' ? 'page.protected' : 'page.notReady'));
  }

  private async pip() {
    const v = this.video;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }
      if (v.disablePictureInPicture) v.disablePictureInPicture = false;
      await v.requestPictureInPicture();
    } catch {
      this.toast(this.t('page.pipFailed'));
    }
  }
}
