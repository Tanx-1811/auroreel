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
import { playedFill } from '../../core/css/decor.ts';
import {
  SPEED_MAX,
  SPEED_MIN,
  type PlayerSettings,
  type ProgressSettings,
  type Settings,
  type ToolbarButton,
} from '../../core/settings.ts';
import type { ProgressBarConfig } from '../../core/sites/types.ts';
import { ACTION_IDS, formatShortcut, matches, type ActionId } from '../../core/shortcuts.ts';
import { translate, type Lang, type MessageKey, type Vars } from '../../shared/i18n.ts';
import type { PageAction, PageStatus, SleepRequest } from '../../shared/messages.ts';
import { loadSpeeds, saveSpeed, updateSettings, upsertTheme } from '../../shared/storage.ts';
import { VolumeBoost } from './audio.ts';
import { ABLoop, clock, SleepTimer } from './timers.ts';
import { themeFromVideo } from './video-theme.ts';
import { Ambient } from './ambient.ts';
import { captureFrame } from './capture.ts';
import { Cinema } from './cinema.ts';
import { el, icon, ICONS } from './dom.ts';
import { elementBox, inside, visibleBox } from './geometry.ts';
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
  progress: ProgressSettings;
  /** The site's own progress bar (for the always-on mini bar), when the skin is on. */
  progressBar?: ProgressBarConfig;
  /** The toolbar stays hidden for videos inside these (the site's ads, short-form players…). */
  hideIn?: string[];
}

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);
/** Media events that move or show/hide the mini progress bar. */
const MINI_EVENTS = ['timeupdate', 'seeked', 'play', 'pause', 'durationchange', 'emptied'] as const;
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
  private host = el('auroreel-ui' as 'div');
  private root = this.host.attachShadow({ mode: __RS_E2E__ ? 'open' : 'closed' });
  private bar = el('div', { class: 'bar', role: 'toolbar' });
  private panel = el('div', { class: 'panel', role: 'dialog' });
  private toastEl = el('div', { class: 'toast', role: 'status', 'aria-live': 'polite' });
  private tip = el('div', { class: 'tip', role: 'tooltip' });
  private miniFill = el('i');
  private mini = el('div', { class: 'mini', 'aria-hidden': 'true' }, this.miniFill);
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
  private followFrame = 0;
  private lastBox = '';
  private sliders = new Map<keyof FilterValues, { input: HTMLInputElement; out: HTMLOutputElement }>();
  private presetChips = new Map<string, HTMLButtonElement>();
  private filterSwitch = el('button', { class: 'switch', role: 'switch' }, el('i'));
  private observer: MutationObserver | null = null;
  private boost = new VolumeBoost();
  private ab = new ABLoop();
  private sleep = new SleepTimer();
  private boostRow: { input: HTMLInputElement; out: HTMLOutputElement } | null = null;
  /** Text of the last toast (the popup shows it after an action). */
  lastNote = '';
  /** Theme paused in this tab (Alt+T); owned by the content script. */
  onToggleSkin: () => void = () => undefined;
  skinPaused = () => false;

  constructor() {
    this.host.dataset.auroreel = 'ui';
    const style = el('style', { text: UI_CSS });
    this.root.append(style, this.mini, this.bar, this.panel, this.toastEl, this.tip);
    this.cinema.onExit = () => this.setCinema(false);
    this.sleep.onFire = () => {
      for (const v of document.querySelectorAll('video')) if (!v.paused) v.pause();
      this.toast(this.t('page.sleepDone'));
    };
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
    this.host.style.setProperty('--mini-fill', playedFill(cfg.progress, cfg.accent) ?? cfg.accent);
    this.host.dataset.size = cfg.settings.toolbarSize;
    if (!cfg.on) {
      this.teardown();
      return;
    }
    if (!this.started) this.start();
    const keysChanged =
      prev?.shortcutsOn !== cfg.shortcutsOn || JSON.stringify(prev?.shortcuts) !== JSON.stringify(cfg.shortcuts);
    const buttonsChanged = prev?.settings.toolbarButtons.join() !== cfg.settings.toolbarButtons.join();
    if (first || prev?.lang !== cfg.lang || keysChanged || buttonsChanged) this.buildBar();
    this.buildPanel();
    this.applyFilters();
    void this.applyBoost(false);
    this.ambient.configure({ ...cfg.settings.ambient, accent: cfg.accent });
    if (cfg.settings.ambient.enabled) this.ambient.enable();
    else this.ambient.disable();
    this.cinema.setDim(cfg.settings.cinema.dim);
    this.refreshButtons();
    this.position();
    this.updateMini();
  }

  status(): Omit<PageStatus, 'platform' | 'skinPaused'> {
    this.pick();
    return {
      hasVideo: !!this.video,
      speed: this.video ? round2(this.video.playbackRate) : 1,
      cinema: this.cinema.on,
      loop: !!this.video?.loop,
      abA: this.ab.a,
      abB: this.ab.b,
      sleep: this.sleep.state,
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
    for (const type of MINI_EVENTS) document.addEventListener(type, this.updateMini, true);
    document.addEventListener('pointermove', this.onPointer, { passive: true, capture: true });
    window.addEventListener('keydown', this.onKey, true);
    document.addEventListener('ended', this.onEnded, true);
    window.addEventListener('wheel', this.onWheel, { passive: false, capture: true });
    window.addEventListener('pointerdown', this.onGesture, true);
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
    for (const type of MINI_EVENTS) document.removeEventListener(type, this.updateMini, true);
    document.removeEventListener('pointermove', this.onPointer, true);
    window.removeEventListener('keydown', this.onKey, true);
    document.removeEventListener('ended', this.onEnded, true);
    window.removeEventListener('wheel', this.onWheel, true);
    window.removeEventListener('pointerdown', this.onGesture, true);
    window.removeEventListener('scroll', this.onViewport, true);
    window.removeEventListener('resize', this.onViewport);
    document.removeEventListener('fullscreenchange', this.onFullscreen);
    cancelAnimationFrame(this.followFrame);
    this.followFrame = 0;
    this.observer?.disconnect();
    this.ambient.disable();
    this.setCinema(false, true);
    for (const v of document.querySelectorAll('video')) this.clearFilter(v);
    this.host.remove();
    this.ab.attach(null);
    this.sleep.set(null);
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
    this.ab.attach(v);
    if (v) {
      this.applyFilters();
      this.applyStartSpeed(v);
      void this.applyBoost(false);
    } else {
      this.showBar(false);
      if (this.cinema.on) this.setCinema(false);
    }
    this.refreshButtons();
  }

  private onPlay = (e: Event) => {
    const v = e.target;
    if (!(v instanceof HTMLVideoElement)) return;
    if (this.sleep.shouldBlock()) {
      v.pause();
      return;
    }
    if (!this.visible(v)) return;
    this.setVideo(v);
    void this.applyBoost(false);
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
    this.bar.setAttribute('aria-label', 'Auroreel');
    this.speedLabel = this.button(
      'speed',
      this.label('page.speedReset', 'speedReset'),
      document.createTextNode('1×'),
      () => this.setSpeed(1),
    );
    this.speedLabel.classList.add('speed');
    const make: Record<ToolbarButton, () => HTMLElement[]> = {
      speed: () => [
        this.button('slower', this.label('page.slower', 'speedDown'), icon(ICONS.minus, 16), () => this.stepSpeed(-1)),
        this.speedLabel,
        this.button('faster', this.label('page.faster', 'speedUp'), icon(ICONS.plus, 16), () => this.stepSpeed(1)),
      ],
      filters: () => [
        this.button(
          'filters',
          this.label('page.filters', 'filters'),
          icon(ICONS.filters),
          () => this.togglePanel(),
          false,
        ),
      ],
      ambient: () => [
        this.button(
          'ambient',
          this.label('page.ambient', 'ambient'),
          icon(ICONS.ambient),
          () => this.toggleAmbient(),
          false,
        ),
      ],
      cinema: () => [
        this.button(
          'cinema',
          this.label('page.cinema', 'cinema'),
          icon(ICONS.cinema),
          () => this.setCinema(!this.cinema.on),
          false,
        ),
      ],
      loop: () => [
        this.button('loop', this.label('page.loop', 'loop'), icon(ICONS.loop), () => this.toggleLoop(), false),
      ],
      ab: () => [
        this.button('ab', this.label('page.abLoop', 'abStart'), icon(ICONS.ab), () => void this.run('abCycle'), false),
      ],
      screenshot: () => [
        this.button(
          'screenshot',
          this.label('page.screenshot', 'screenshot'),
          icon(ICONS.camera),
          () => void this.screenshot(),
        ),
      ],
      pip: () => [this.button('pip', this.label('page.pip', 'pip'), icon(ICONS.pip), () => void this.pip())],
      palette: () => [
        this.button(
          'palette',
          this.label('page.videoTheme', 'themeFromVideo'),
          icon(ICONS.palette),
          () => void this.videoTheme(),
        ),
      ],
    };
    // Groups split by a thin line: speed | tools | colour from the video.
    const groups: ToolbarButton[][] = [
      ['speed'],
      ['filters', 'ambient', 'cinema', 'loop', 'ab', 'screenshot', 'pip'],
      ['palette'],
    ];
    const shown = new Set(this.cfg?.settings.toolbarButtons ?? []);
    const parts = groups
      .map((g) => g.filter((id) => shown.has(id)).flatMap((id) => make[id]()))
      .filter((g) => g.length);
    parts.forEach((g, i) => {
      if (i) this.bar.append(el('span', { class: 'sep' }));
      this.bar.append(...g);
    });
  }

  private refreshButtons() {
    const v = this.video;
    const cfg = this.cfg;
    if (!cfg) return;
    this.speedLabel.textContent = `${round2(v?.playbackRate ?? 1)}×`;
    this.buttons.get('ambient')?.setAttribute('aria-pressed', String(cfg.settings.ambient.enabled));
    this.buttons.get('cinema')?.setAttribute('aria-pressed', String(this.cinema.on));
    this.buttons.get('loop')?.setAttribute('aria-pressed', String(!!v?.loop || this.ab.b !== null));
    this.buttons.get('ab')?.setAttribute('aria-pressed', String(this.ab.a !== null));
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
    this.updateMini();
    const v = this.video;
    if (!v || !this.cfg?.settings.toolbar) return;
    if (inside(elementBox(v), e.clientX, e.clientY)) {
      this.showBar(true);
      this.scheduleHide(2600);
    } else if (!this.overUi && !this.panelOpen) this.scheduleHide(500);
  };

  private onViewport = () => {
    if (this.barVisible || this.panelOpen) this.position();
    this.updateMini();
  };

  /**
   * A thin progress line along the bottom of the video while the site hides its own controls (YouTube stops
   * drawing its bar then). Only for sites whose adapter names the "controls hidden" state.
   */
  private updateMini = () => {
    const cfg = this.cfg;
    const v = this.video;
    const bar = cfg?.progressBar;
    const show =
      !!cfg?.progress.mini &&
      !!v &&
      !!bar &&
      Number.isFinite(v.duration) &&
      v.duration > 0 &&
      !!v.closest(`${bar.root}${bar.idle}`) &&
      this.roomy(false);
    this.mini.classList.toggle('show', show);
    if (!show || !v) return;
    const b = visibleBox(elementBox(v), innerWidth, innerHeight);
    // Inset from the edges so it clears the player's rounded corners.
    this.mini.style.left = `${b.x + 12}px`;
    this.mini.style.top = `${b.y + b.h - 10}px`;
    this.mini.style.width = `${Math.max(0, b.w - 24)}px`;
    this.miniFill.style.transform = `scaleX(${Math.min(1, v.currentTime / v.duration)})`;
  };

  private onFullscreen = () => {
    const fs = document.fullscreenElement;
    const parent = fs && !(fs instanceof HTMLVideoElement) && this.video && fs.contains(this.video) ? fs : null;
    (parent ?? document.body ?? document.documentElement).append(this.host);
    this.position();
    this.updateMini();
  };

  private scheduleHide(ms: number) {
    clearTimeout(this.hideTimer);
    this.hideTimer = window.setTimeout(() => {
      if (this.overUi || this.panelOpen) return;
      this.showBar(false);
    }, ms);
  }

  /**
   * Enough of the video is on screen to carry the toolbar (not a sliver, not a player still being laid out,
   * not a miniplayer narrower than the bar) and the site isn't using that spot (ads, Shorts).
   */
  private roomy(forBar = true): boolean {
    const v = this.video;
    if (!v) return false;
    if (this.cfg?.hideIn?.some((s) => v.closest(s))) return false;
    const seen = visibleBox(elementBox(v), innerWidth, innerHeight);
    const minW = forBar ? Math.max(300, (this.bar.offsetWidth || 340) + 24) : 160;
    return seen.w >= minW && seen.h >= (forBar ? 120 : 90);
  }

  private showBar(show: boolean) {
    if (show && (!this.cfg?.settings.toolbar || !this.roomy())) show = false;
    this.barVisible = show;
    this.bar.classList.toggle('show', show);
    if (!show) this.tip.classList.remove('show');
    if (show) {
      this.position();
      this.follow();
    }
  }

  /**
   * While the toolbar or panel is shown, keep them on the video every frame: sites move their player without
   * scrolling or resizing (YouTube lays it out after load, theatre mode, chat opening…).
   */
  private follow() {
    if (this.followFrame) return;
    const tick = () => {
      this.followFrame = 0;
      if (!this.started || !this.video || !(this.barVisible || this.panelOpen)) return;
      if (!this.panelOpen && !this.roomy()) return this.showBar(false);
      const b = elementBox(this.video);
      const key = `${b.x},${b.y},${b.w},${b.h}`;
      if (key !== this.lastBox) {
        this.lastBox = key;
        this.position();
      }
      this.followFrame = requestAnimationFrame(tick);
    };
    this.followFrame = requestAnimationFrame(tick);
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
    this.lastNote = big ? `${big} ${text}` : text;
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
      const boostId = 'rs-boost';
      const boostInput = el('input', { id: boostId, type: 'range', min: 100, max: 300, step: 10 });
      const boostOut = el('output', { for: boostId });
      boostInput.addEventListener('input', () => {
        const value = Number(boostInput.value);
        this.setBoostSlider(value);
        this.persist((s) => ({ ...s, boost: value }), 250);
        void this.applyBoost(true);
      });
      this.boostRow = { input: boostInput, out: boostOut };
      const boostRow = el(
        'div',
        { class: 'row' },
        el('label', { for: boostId, text: this.t('page.boost') }),
        boostInput,
        boostOut,
      );
      const reset = el('button', { class: 'text-btn', text: this.t('common.reset') });
      reset.addEventListener('click', () => this.persist((s) => ({ ...s, filters: { ...FILTER_PRESETS.natural } }), 0));
      this.panel.append(
        el('h3', {}, el('span', { text: this.t('page.filters') }), close),
        chips,
        ...rows,
        el('div', { class: 'foot' }, this.filterSwitch, reset),
        el('h4', { text: this.t('page.sound') }),
        boostRow,
      );
    }
    const f = cfg.settings.filters;
    for (const k of FILTER_KEYS) this.setSlider(k, f[k]);
    const preset = matchPreset(f);
    for (const [id, chip] of this.presetChips)
      chip.setAttribute('aria-pressed', String(cfg.settings.filtersOn && id === preset));
    this.filterSwitch.setAttribute('aria-checked', String(cfg.settings.filtersOn));
    this.setBoostSlider(cfg.settings.boost);
  }

  private setBoostSlider(value: number) {
    const r = this.boostRow;
    if (!r) return;
    if (this.root.activeElement !== r.input) r.input.value = String(value);
    r.input.style.setProperty('--pct', `${((value - 100) / 200) * 100}%`);
    r.out.textContent = `${value}%`;
  }

  /** Volume boost from the settings; `explicit` when the user just changed it (reports problems). */
  private async applyBoost(explicit: boolean) {
    const v = this.video;
    const cfg = this.cfg;
    if (!v || !cfg) return;
    if (cfg.settings.boost <= 100 && !this.boost.has(v)) return;
    const result = await this.boost.apply(v, cfg.settings.boost);
    if (explicit && result === 'unsupported') this.toast(this.t('page.boostUnsupported'));
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

  async run(action: PageAction | ActionId): Promise<void> {
    this.lastNote = '';
    if (action === 'toggleSkin') {
      this.onToggleSkin();
      this.toast(this.t(this.skinPaused() ? 'page.skinOff' : 'page.skinOn'));
      return;
    }
    this.pick();
    const v = this.video;
    if (!v) return;
    switch (action) {
      case 'abStart':
        this.ab.setA(v.currentTime);
        this.refreshButtons();
        return this.toast(this.t('page.abA', { time: clock(v.currentTime) }));
      case 'abEnd':
        if (!this.ab.setB(v.currentTime)) return this.toast(this.t('page.abNeedA'));
        this.refreshButtons();
        return this.toast(this.t('page.abOn', { a: clock(this.ab.a!), b: clock(this.ab.b!) }));
      case 'abClear':
        this.ab.clear();
        this.refreshButtons();
        return this.toast(this.t('page.abOff'));
      case 'abCycle':
        return this.run(this.ab.a === null ? 'abStart' : this.ab.b === null ? 'abEnd' : 'abClear');
      case 'themeFromVideo':
        return this.videoTheme();
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
        return this.screenshot();
      case 'pip':
        return this.pip();
    }
  }

  /** Sleep timer from the popup. */
  setSleep(req: SleepRequest) {
    this.sleep.set(req);
    if (req === null) this.toast(this.t('page.sleepOff'));
    else if (req === 'end') this.toast(this.t('page.sleepEnd'));
    else this.toast(this.t('page.sleepIn', { n: req }));
  }

  private onEnded = (e: Event) => {
    if (e.target === this.video) this.sleep.ended();
  };

  /** A click on the page lets a pending volume boost start its audio. */
  private onGesture = () => {
    if (this.cfg && this.cfg.settings.boost > 100 && this.video && !this.boost.has(this.video))
      void this.applyBoost(false);
  };

  private onWheel = (e: WheelEvent) => {
    const v = this.video;
    if (!v || !this.cfg?.settings.wheelVolume || e.ctrlKey || e.metaKey) return;
    if (!inside(elementBox(v), e.clientX, e.clientY)) return;
    e.preventDefault();
    e.stopPropagation();
    const next = Math.min(1, Math.max(0, Math.round((v.volume + (e.deltaY < 0 ? 0.05 : -0.05)) * 100) / 100));
    v.volume = next;
    if (next > 0 && v.muted) v.muted = false;
    this.toast(this.t('page.volume'), `${Math.round(next * 100)}%`);
  };

  private async videoTheme() {
    const v = this.video;
    if (!v || !this.cfg) return;
    const title = document.title.replace(/\s*[-–|]\s*(YouTube|Twitch|Netflix).*$/i, '').trim() || 'Video';
    const result = themeFromVideo(v, this.t('page.videoThemeName', { title: title.slice(0, 28) }));
    if (result === 'protected' || result === 'not-ready') {
      this.toast(this.t(result === 'protected' ? 'page.protected' : 'page.notReady'));
      return;
    }
    try {
      await upsertTheme(result);
      await updateSettings((s) => ({ ...s, themeId: result.id }));
      this.toast(this.t('page.videoThemeDone'));
    } catch {
      this.toast(this.t('page.videoThemeFailed'));
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
    void this.run(action);
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
