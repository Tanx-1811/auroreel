/**
 * The recolouring engine's DOM half (the maths is in core/remap.ts).
 *
 * 1. Reads each stylesheet's rules once (and rules added later by CSS-in-JS):
 *    the custom properties the site switches between its light and dark
 *    modes, how properties are used (text or background) and — on sites that
 *    hard-code colours (`rewrite`) — every rule with a literal colour.
 *    Cross-origin stylesheets are fetched when the adapter asks (`fetchCss`).
 * 2. Reads the current values of the themeable properties with Auroreel's
 *    styles switched off.
 * 3. Writes the replacements into the engine <style>.
 *
 * The result is cached per site and mode, so the next visit is recoloured
 * before the site's stylesheets have even loaded.
 */
import { parseColor } from '../core/color.ts';
import type { PlatformId } from '../core/platforms.ts';
import {
  collectUsage,
  createRemapper,
  isColorProperty,
  isRewritable,
  isRootLikeSelector,
  overridesCss,
  rewriteCss,
  roleOf,
  themeableNames,
  type DeclaredRule,
  type RewriteRule,
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
  /** Rules with literal colours (rewrite mode). */
  rewrite?: RewriteRule[];
}

const MODE_ATTRS = ['class', 'dark', 'light', 'darker-dark-theme', 'data-theme', 'data-color-mode', 'data-mode'];
/** Most rewritten rules kept (a huge site stays responsive; the commonest rules come first). */
const MAX_REWRITE = 8000;
const MAX_CSS_CHARS = 4_000_000;

export class Engine {
  private rules: DeclaredRule[] = [];
  private rewrite: RewriteRule[] = [];
  private seenRules = new WeakSet<CSSRule>();
  /** Rewritten rules by content (CSS-in-JS re-creates identical rules). */
  private rewriteKeys = new Set<string>();
  /** Selectors (with their conditions) that have a rewritten rule: later rules for them are copied too. */
  private rewrittenSelectors = new Set<string>();
  private sheetLengths = new WeakMap<CSSStyleSheet, number>();
  /** Cross-origin stylesheets fetched and parsed (rewrite sites). */
  private fetched = new Map<string, CSSStyleSheet | 'pending' | 'failed'>();
  private names = new Set<string>();
  private fgUse = new Set<string>();
  private bgUse = new Set<string>();
  private selectors: string[] = [];
  private theme: EngineTheme | null = null;
  private snapshot: Snapshot | null = null;
  private savedJson = '';
  private scanTimer = 0;
  private computeTimer = 0;
  private recheckTimer = 0;
  private observers: MutationObserver[] = [];
  private mode = '';
  private lastSave = 0;

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
    const sheetObserver = new MutationObserver((records) => {
      for (const r of records) {
        for (const n of r.addedNodes) {
          if (n instanceof HTMLLinkElement && n.rel === 'stylesheet') {
            n.addEventListener('load', () => this.scheduleScan(80), { once: true });
          } else if (n instanceof HTMLStyleElement && !n.dataset.auroreel) this.scheduleScan(150);
        }
      }
    });
    sheetObserver.observe(html, { childList: true, subtree: true });
    // CSS-in-JS libraries add rules to existing <style> elements without touching the DOM;
    // look again (throttled) while the page keeps changing, e.g. after in-app navigation.
    const pageObserver = new MutationObserver(() => {
      if (this.recheckTimer) return;
      this.recheckTimer = window.setTimeout(() => {
        this.recheckTimer = 0;
        if (this.scan()) this.scheduleCompute(0);
      }, 1500);
    });
    const watchBody = () => {
      if (!document.body) return;
      modeObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
      pageObserver.observe(document.body, { childList: true, subtree: true });
    };
    if (document.body) watchBody();
    else document.addEventListener('DOMContentLoaded', watchBody, { once: true });
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
    this.observers.push(modeObserver, sheetObserver, pageObserver);
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
    clearTimeout(this.recheckTimer);
    this.theme = null;
    this.styles.setEngine('');
  }

  private get hasWork() {
    return this.names.size > 0 || this.rewrite.length > 0;
  }

  private async loadCache() {
    const key = engineKey(this.platform, this.mode);
    try {
      const got = await chrome.storage.local.get(key);
      const snap = got[key] as Snapshot | undefined;
      if (snap && typeof snap === 'object' && snap.values && snap.anchors) {
        this.savedJson = JSON.stringify(snap);
        if (!this.hasWork) this.apply(snap);
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

  /** Fetches a stylesheet the page can't expose: CORS first, then through the service worker. */
  private async fetchSheet(href: string) {
    this.fetched.set(href, 'pending');
    let text: string | null = null;
    try {
      const res = await fetch(href, { credentials: 'omit' });
      if (res.ok) text = await res.text();
    } catch {
      // No CORS headers: ask the service worker (it may fetch the site's own CSS hosts).
    }
    if (text === null) {
      try {
        const reply = (await chrome.runtime.sendMessage({ type: 'rs:fetch-css', url: href })) as {
          text?: string;
        } | null;
        text = reply?.text ?? null;
      } catch {
        text = null;
      }
    }
    if (text === null || text.length > MAX_CSS_CHARS) {
      this.fetched.set(href, 'failed');
      return;
    }
    try {
      const sheet = new CSSStyleSheet();
      sheet.replaceSync(text);
      this.fetched.set(href, sheet);
      this.scheduleScan(0);
    } catch {
      this.fetched.set(href, 'failed');
    }
  }

  /** Reads rules not seen before; true when something new was found. */
  private scan(): boolean {
    const sheets: CSSStyleSheet[] = [...document.styleSheets, ...(document.adoptedStyleSheets ?? [])];
    let added = false;
    const rewriting = !!this.cfg.rewrite;

    const walk = (rules: CSSRuleList, wrap: string[]) => {
      for (const r of rules) {
        if (r instanceof CSSStyleRule) {
          if (this.seenRules.has(r)) continue;
          this.seenRules.add(r);
          added = true;
          collectUsage(r.style, this.fgUse, this.bgUse);
          const rootLike = isRootLikeSelector(r.selectorText);
          const declared: [string, string][] = [];
          const literal: [string, string, boolean?, boolean?][] = [];
          const where = `${wrap.join('|')}|${r.selectorText}`;
          const follows = rewriting && this.rewrittenSelectors.has(where);
          for (let i = 0; i < r.style.length; i++) {
            const name = r.style[i]!;
            const custom = name.startsWith('--');
            if (custom && !this.accept(name)) continue;
            const value = r.style.getPropertyValue(name);
            if (custom && rootLike) declared.push([name, value]);
            if (!rewriting) continue;
            const important = !!r.style.getPropertyPriority(name);
            if (isRewritable(name, value)) literal.push([name, value.trim(), important]);
            else if (follows && isColorProperty(name) && value.trim())
              literal.push([name, value.trim(), important, true]);
          }
          if (declared.length) this.rules.push({ selector: r.selectorText, decls: declared });
          if (literal.length && this.rewrite.length < MAX_REWRITE) {
            const entry: RewriteRule = {
              wrap,
              selector: r.selectorText,
              decls: literal,
              ...(follows ? { follows } : {}),
            };
            const key = JSON.stringify(entry);
            if (!this.rewriteKeys.has(key)) {
              this.rewriteKeys.add(key);
              this.rewrite.push(entry);
              this.rewrittenSelectors.add(where);
            }
          }
        } else if (r instanceof CSSMediaRule) {
          walk(r.cssRules, [...wrap, `@media ${r.conditionText}`]);
        } else if (r instanceof CSSSupportsRule) {
          walk(r.cssRules, [...wrap, `@supports ${r.conditionText}`]);
        } else if (typeof CSSContainerRule !== 'undefined' && r instanceof CSSContainerRule) {
          walk(r.cssRules, [...wrap, `@container ${r.conditionText}`]);
        } else if (r instanceof CSSLayerBlockRule) {
          walk(r.cssRules, wrap);
        }
      }
    };

    for (const sheet of sheets) {
      if ((sheet.ownerNode as HTMLElement | null)?.dataset?.auroreel !== undefined) continue;
      let list: CSSRuleList;
      try {
        list = sheet.cssRules;
      } catch {
        // Cross-origin without CORS headers (or still loading).
        const href = sheet.href;
        if (this.cfg.fetchCss && href && !this.fetched.has(href)) void this.fetchSheet(href);
        continue;
      }
      if (this.sheetLengths.get(sheet) === list.length) continue;
      this.sheetLengths.set(sheet, list.length);
      walk(list, []);
    }
    for (const sheet of this.fetched.values()) {
      if (typeof sheet === 'string' || this.sheetLengths.has(sheet)) continue;
      this.sheetLengths.set(sheet, sheet.cssRules.length);
      walk(sheet.cssRules, []);
    }
    if (!added) return false;

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
    this.names = names;
    this.selectors = [...selectors];
    return true;
  }

  private compute() {
    if (!this.theme || !this.hasWork) return;
    const target = document.body ?? document.documentElement;
    const fixed = this.cfg.anchorColors;
    const snap = this.styles.withoutOurs((): Snapshot => {
      const cs = getComputedStyle(target);
      const values: Record<string, string> = {};
      for (const n of this.names) {
        const v = cs.getPropertyValue(n).trim();
        if (v && parseColor(v)) values[n] = v;
      }
      const read = (name?: string) => (name ? cs.getPropertyValue(name).trim() || undefined : undefined);
      const ok = (c?: string) => !!c && (parseColor(c)?.a ?? 0) > 0.5;
      const anchors = {
        bg: read(this.cfg.anchors.bg),
        text: read(this.cfg.anchors.text),
        surface: read(this.cfg.anchors.surface) ?? fixed?.surface,
        muted: read(this.cfg.anchors.muted) ?? fixed?.muted,
      };
      if (!ok(anchors.bg)) {
        const bodyBg = getComputedStyle(target).backgroundColor;
        const htmlBg = getComputedStyle(document.documentElement).backgroundColor;
        anchors.bg = fixed?.bg ?? [bodyBg, htmlBg].find(ok) ?? 'rgb(255,255,255)';
      }
      if (!ok(anchors.text)) anchors.text = fixed?.text ?? getComputedStyle(target).color;
      const bgOnly = Object.keys(values).filter((n) => roleOf(n, this.fgUse, this.bgUse) === 'bg');
      return { values, anchors, selectors: this.selectors, bgOnly, rewrite: this.rewrite };
    });
    this.apply(snap);
    // Cache for the next visit (throttled: CSS-in-JS sites keep adding rules while you browse).
    const cached: Snapshot = { ...snap, rewrite: snap.rewrite?.slice(0, 3000) };
    const json = JSON.stringify(cached);
    const now = Date.now();
    if (
      json !== this.savedJson &&
      now - this.lastSave > 10_000 &&
      (Object.keys(snap.values).length || snap.rewrite?.length)
    ) {
      this.savedJson = json;
      this.lastSave = now;
      void chrome.storage.local.set({ [engineKey(this.platform, this.mode)]: cached }).catch(() => undefined);
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
    this.styles.setEngine(
      overridesCss(selectors.length ? selectors : this.cfg.rootSelectors, out) + rewriteCss(snap.rewrite ?? [], remap),
    );
  }
}
