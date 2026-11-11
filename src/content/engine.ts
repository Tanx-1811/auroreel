/**
 * The recolouring engine's DOM half (the maths is in core/remap.ts).
 *
 * 1. Reads the page's stylesheets once each and finds the custom properties
 *    the site switches between its light and dark modes.
 * 2. Reads their current values with Reelskin's styles switched off.
 * 3. Writes a replacement for each into the engine <style>.
 *
 * The values are cached per site and mode, so the next visit is recoloured
 * before the site's stylesheets have even loaded.
 */
import { parseColor } from '../core/color.ts';
import type { PlatformId } from '../core/platforms.ts';
import {
  collectUsage,
  createRemapper,
  isRootLikeSelector,
  overridesCss,
  roleOf,
  themeableNames,
  type DeclaredRule,
} from '../core/remap.ts';
import type { EngineConfig } from '../core/sites/index.ts';
import type { Palette } from '../core/themes.ts';
import { engineKey } from '../shared/storage.ts';
import type { Styles } from './styles.ts';

export interface EngineTheme {
  palette: Palette;
  /** Backdrop glass percent, or null for a flat background. */
  glass: number | null;
}

interface Snapshot {
  values: Record<string, string>;
  /** Properties the site only uses as backgrounds (may turn see-through over a backdrop). */
  bgOnly?: string[];
  anchors: { bg?: string; text?: string; surface?: string; muted?: string };
  selectors: string[];
}

const MODE_ATTRS = ['class', 'dark', 'light', 'darker-dark-theme', 'data-theme', 'data-color-mode', 'data-mode'];

export class Engine {
  private rules: DeclaredRule[] = [];
  private seen = new WeakSet<CSSStyleSheet>();
  private names = new Set<string>();
  private fgUse = new Set<string>();
  private bgUse = new Set<string>();
  private selectors: string[] = [];
  private theme: EngineTheme | null = null;
  private snapshot: Snapshot | null = null;
  private savedJson = '';
  private scanTimer = 0;
  private computeTimer = 0;
  private observers: MutationObserver[] = [];
  private mode = '';

  private cfg: EngineConfig;
  private styles: Styles;
  private platform: PlatformId;

  constructor(cfg: EngineConfig, styles: Styles, platform: PlatformId) {
    this.cfg = cfg;
    this.styles = styles;
    this.platform = platform;
  }

  private accept = (name: string) => this.cfg.accept.test(name) && !this.cfg.exclude?.test(name);

  /** Light/dark signature of the page (separate caches for each). */
  private readMode(): string {
    const html = document.documentElement;
    const cls = `${html.className} ${document.body?.className ?? ''}`;
    if (html.hasAttribute('dark') || /theme-dark|\bdark\b/.test(cls) || html.dataset.theme === 'dark') return 'dark';
    return 'light';
  }

  async start(theme: EngineTheme) {
    this.theme = theme;
    this.mode = this.readMode();
    await this.loadCache();
    if (this.observers.length) return;
    const html = document.documentElement;
    const modeObserver = new MutationObserver(() => {
      const mode = this.readMode();
      if (mode !== this.mode) {
        this.mode = mode;
        void this.loadCache().then(() => this.scheduleCompute(30));
      } else this.scheduleCompute(60);
    });
    modeObserver.observe(html, { attributes: true, attributeFilter: MODE_ATTRS });
    const watchBody = () => {
      if (document.body) modeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    };
    if (document.body) watchBody();
    else document.addEventListener('DOMContentLoaded', watchBody, { once: true });
    const sheetObserver = new MutationObserver((records) => {
      for (const r of records) {
        for (const n of r.addedNodes) {
          if (n instanceof HTMLLinkElement && n.rel === 'stylesheet') {
            n.addEventListener('load', () => this.scheduleScan(80), { once: true });
          } else if (n instanceof HTMLStyleElement && !n.dataset.reelskin) this.scheduleScan(150);
        }
      }
    });
    sheetObserver.observe(html, { childList: true, subtree: true });
    // The head fills in while the page parses; stop watching the whole tree once it has loaded.
    window.addEventListener(
      'load',
      () => {
        sheetObserver.disconnect();
        if (document.head) sheetObserver.observe(document.head, { childList: true });
        this.scheduleScan(0);
      },
      { once: true },
    );
    document.addEventListener('DOMContentLoaded', () => this.scheduleScan(0), { once: true });
    this.observers.push(modeObserver, sheetObserver);
    this.scheduleScan(document.readyState === 'loading' ? 400 : 0);
  }

  setTheme(theme: EngineTheme | null) {
    this.theme = theme;
    if (!theme) {
      this.styles.setEngine('');
      return;
    }
    if (this.snapshot) this.apply(this.snapshot);
    this.scheduleCompute(0);
  }

  stop() {
    for (const o of this.observers) o.disconnect();
    this.observers = [];
    clearTimeout(this.scanTimer);
    clearTimeout(this.computeTimer);
    this.theme = null;
    this.styles.setEngine('');
  }

  private async loadCache() {
    const key = engineKey(this.platform, this.mode);
    try {
      const got = await chrome.storage.local.get(key);
      const snap = got[key] as Snapshot | undefined;
      if (snap && typeof snap === 'object' && snap.values && snap.anchors) {
        this.savedJson = JSON.stringify(snap);
        if (!this.names.size) this.apply(snap);
      }
    } catch {
      // Storage unavailable (extension reloaded): the live scan still works.
    }
  }

  private scheduleScan(ms: number) {
    clearTimeout(this.scanTimer);
    this.scanTimer = window.setTimeout(() => {
      if (this.scan()) this.scheduleCompute(0);
    }, ms);
  }

  private scheduleCompute(ms: number) {
    clearTimeout(this.computeTimer);
    this.computeTimer = window.setTimeout(() => this.compute(), ms);
  }

  /** Reads stylesheets not seen before; true when the set of themeable properties changed. */
  private scan(): boolean {
    const sheets = [...document.styleSheets, ...(document.adoptedStyleSheets ?? [])];
    let added = false;
    for (const sheet of sheets) {
      if (this.seen.has(sheet) || (sheet.ownerNode as HTMLElement | null)?.dataset?.reelskin !== undefined) continue;
      let list: CSSRuleList;
      try {
        list = sheet.cssRules;
      } catch {
        continue; // cross-origin without CORS, or still loading
      }
      this.seen.add(sheet);
      const walk = (rules: CSSRuleList) => {
        for (const r of rules) {
          if (r instanceof CSSStyleRule) {
            collectUsage(r.style, this.fgUse, this.bgUse);
            if (!isRootLikeSelector(r.selectorText)) continue;
            const decls: [string, string][] = [];
            for (let i = 0; i < r.style.length; i++) {
              const name = r.style[i]!;
              if (name.startsWith('--') && this.accept(name)) decls.push([name, r.style.getPropertyValue(name)]);
            }
            if (decls.length) this.rules.push({ selector: r.selectorText, decls });
          } else if (
            'cssRules' in r &&
            (r instanceof CSSMediaRule || r instanceof CSSSupportsRule || r instanceof CSSLayerBlockRule)
          ) {
            walk(r.cssRules);
          }
        }
      };
      walk(list);
      added = true;
    }
    if (!added && this.names.size) return false;
    const names = themeableNames(this.rules, this.accept);
    // Sites that load only the active mode's palette (styled-components on Twitch) declare each
    // property once; the adapter's semantic pattern names the ones to recolour anyway.
    if (this.cfg.semantic) {
      const cs = getComputedStyle(document.documentElement);
      for (let i = 0; i < cs.length; i++) {
        const n = cs[i]!;
        if (n.startsWith('--') && this.cfg.semantic.test(n) && !this.cfg.exclude?.test(n)) names.add(n);
      }
    }
    const selectors = new Set(this.cfg.rootSelectors);
    for (const r of this.rules) {
      if (selectors.size >= 48) break;
      if (r.decls.some(([n]) => names.has(n))) {
        for (const part of r.selector.split(',')) selectors.add(part.trim());
      }
    }
    const changed = names.size !== this.names.size || [...names].some((n) => !this.names.has(n));
    this.names = names;
    this.selectors = [...selectors];
    return changed || added;
  }

  private compute() {
    if (!this.theme || !this.names.size) return;
    const target = document.body ?? document.documentElement;
    const snap = this.styles.withoutOurs((): Snapshot => {
      const cs = getComputedStyle(target);
      const values: Record<string, string> = {};
      for (const n of this.names) {
        const v = cs.getPropertyValue(n).trim();
        if (v && parseColor(v)) values[n] = v;
      }
      const read = (name?: string) => (name ? cs.getPropertyValue(name).trim() || undefined : undefined);
      const anchors = {
        bg: read(this.cfg.anchors.bg),
        text: read(this.cfg.anchors.text),
        surface: read(this.cfg.anchors.surface),
        muted: read(this.cfg.anchors.muted),
      };
      if (!anchors.bg || !parseColor(anchors.bg) || parseColor(anchors.bg)!.a < 0.5) {
        const bodyBg = getComputedStyle(target).backgroundColor;
        const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
        anchors.bg = [bodyBg, htmlBg].find((c) => (parseColor(c)?.a ?? 0) > 0.5) ?? 'rgb(255,255,255)';
      }
      if (!anchors.text || !parseColor(anchors.text)) anchors.text = getComputedStyle(target).color;
      const bgOnly = Object.keys(values).filter((n) => roleOf(n, this.fgUse, this.bgUse) === 'bg');
      return { values, anchors, selectors: this.selectors, bgOnly };
    });
    this.apply(snap);
    const json = JSON.stringify(snap);
    if (json !== this.savedJson && Object.keys(snap.values).length) {
      this.savedJson = json;
      void chrome.storage.local.set({ [engineKey(this.platform, this.mode)]: snap }).catch(() => undefined);
    }
  }

  private apply(snap: Snapshot) {
    this.snapshot = snap;
    if (!this.theme) return;
    const bg = parseColor(snap.anchors.bg ?? '');
    const text = parseColor(snap.anchors.text ?? '');
    if (!bg || !text) return;
    const remap = createRemapper({
      palette: this.theme.palette,
      anchors: {
        bg,
        text,
        surface: parseColor(snap.anchors.surface ?? '') ?? undefined,
        muted: parseColor(snap.anchors.muted ?? '') ?? undefined,
      },
      brand: this.cfg.brand,
      link: this.cfg.link,
      glass: this.theme.glass,
    });
    const out = new Map<string, string>();
    const bgOnly = new Set(snap.bgOnly ?? []);
    for (const [name, value] of Object.entries(snap.values)) {
      const mapped = remap(value, bgOnly.has(name) ? 'bg' : 'fg');
      if (mapped) out.set(name, mapped);
    }
    const selectors = snap.selectors.filter((s) => s && isRootLikeSelector(s));
    this.styles.setEngine(overridesCss(selectors.length ? selectors : this.cfg.rootSelectors, out));
  }
}
