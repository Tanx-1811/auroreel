/**
 * YouTube (www.youtube.com). Palette tokens: `--yt-sys-color-baseline--*`
 * plus hashed `--t<16 hex>` design tokens, defined on html, [dark] and [light]
 * (checked with scripts/probe-site.mjs, 2026-11).
 */
import { hasBackdrop, hide, rule, type CssContext } from '../css/common.ts';
import type { LayoutStrings, SiteAdapter } from './types.ts';

const SYS = '--yt-sys-color-baseline--';
const ROOTS = ['html', '[dark]', '[light]'];

function fixedTokens(): string {
  const v: Record<string, string> = {
    'base-background': 'var(--rs-page)',
    'raised-background': 'var(--rs-surface)',
    'menu-background': 'var(--rs-surface)',
    'text-primary': 'var(--rs-text)',
    'text-secondary': 'var(--rs-muted)',
    'call-to-action': 'var(--rs-link)',
    'static-brand-red': 'var(--rs-accent)',
    'red-indicator': 'var(--rs-accent)',
    outline: 'var(--rs-border)',
  };
  const sys = Object.entries(v).map(([k, val]) => `${SYS}${k}:${val}!important`);
  // Older components still read the legacy spec tokens.
  const spec = {
    'base-background': 'var(--rs-page)',
    'raised-background': 'var(--rs-surface)',
    'menu-background': 'var(--rs-surface)',
    'text-primary': 'var(--rs-text)',
    'text-secondary': 'var(--rs-muted)',
    'call-to-action': 'var(--rs-link)',
    'static-brand-red': 'var(--rs-accent)',
    'brand-background-solid': 'var(--rs-page)',
    'general-background-a': 'var(--rs-page)',
  };
  const legacy = Object.entries(spec).map(([k, val]) => `--yt-spec-${k}:${val}!important`);
  return rule(ROOTS, [...sys, ...legacy].join(';'));
}

const THUMBS = [
  'ytd-thumbnail #thumbnail',
  'ytd-thumbnail',
  'yt-thumbnail-view-model',
  'ytd-playlist-thumbnail',
  'ytm-shorts-lockup-view-model [class*="ThumbnailContainer"]',
];

function themeCss({ theme }: CssContext): string {
  const glass = hasBackdrop(theme);
  let css = fixedTokens();
  // YouTube's own ambient mode paints big canvases (black until the video plays) over the
  // backdrop; Reelskin's ambient light replaces it while a theme is on.
  css += hide(['#cinematics', '#cinematics-container']);
  if (glass) {
    css += rule(
      ['ytd-app', 'ytd-page-manager', 'ytd-browse', 'ytd-search', 'ytd-watch-flexy', '#columns.ytd-watch-flexy'],
      'background:transparent!important',
    );
  }
  // Frosted top bar, side menu and sticky chip bar.
  css += rule(
    ['ytd-masthead #background', '#masthead-container #background'],
    `background:var(--rs-glass-bg)!important;backdrop-filter:blur(20px) saturate(1.5)`,
  );
  css += rule(
    ['tp-yt-app-drawer#guide #contentContainer', 'tp-yt-app-drawer #guide-content'],
    `background:var(--rs-glass-bg)!important;backdrop-filter:blur(24px) saturate(1.4)`,
  );
  css += rule(
    ['ytd-feed-filter-chip-bar-renderer #chips-wrapper', 'ytd-rich-grid-renderer #header'],
    `background:${glass ? 'var(--rs-glass-bg)' : 'var(--rs-bg)'}!important;${glass ? 'backdrop-filter:blur(20px)' : ''}`,
  );
  // The search box hard-codes its colours (with a separate "Dark" variant).
  css += rule(
    ['.ytSearchboxComponentInputBox', '.ytSearchboxComponentInputBoxDark'],
    `background:${glass ? 'color-mix(in oklab,var(--rs-surface) 72%,transparent)' : 'var(--rs-bg)'}!important;border-color:var(--rs-border)!important;color:var(--rs-text)!important`,
  );
  css += rule(['.ytSearchboxComponentInput', '.ytSearchboxComponentInputDark'], 'color:var(--rs-text)!important');
  css += rule(
    ['.ytSearchboxComponentSearchButton', '.ytSearchboxComponentSearchButtonDark'],
    'background:var(--rs-surface)!important;border-color:var(--rs-border)!important;color:var(--rs-text)!important',
  );
  css += rule(
    ['.ytSearchboxComponentSearchButton:hover', '.ytSearchboxComponentSearchButtonDark:hover'],
    'background:var(--rs-surface-2)!important',
  );
  css += rule(
    ['.ytSearchboxComponentSuggestionsContainer', '.ytSearchboxComponentSuggestionsContainerDark'],
    'background:var(--rs-surface)!important;border-color:var(--rs-border)!important;color:var(--rs-text)',
  );
  // Description and comment text get a fixed inline colour from YouTube's script.
  css += rule(
    [
      'ytd-text-inline-expander span[style*="color: rgb("]',
      '#description span[style*="color: rgb("]',
      '#content-text span[style*="color: rgb("]',
    ],
    'color:inherit!important',
  );
  // Menus and dialogs stay solid so they read well over anything.
  css += rule(
    ['ytd-menu-popup-renderer', 'ytd-multi-page-menu-renderer', 'tp-yt-paper-dialog', 'yt-sheet-view-model'],
    'background:var(--rs-surface)!important',
  );
  // Rounded corners.
  css += rule(THUMBS, 'border-radius:var(--rs-radius)!important;overflow:hidden');
  css += rule(
    THUMBS.map((s) => `${s} img`),
    'border-radius:var(--rs-radius)!important',
  );
  css += rule(
    [
      'ytd-watch-flexy:not([theater]):not([fullscreen]) #ytd-player',
      'ytd-watch-flexy:not([theater]):not([fullscreen]) #movie_player',
    ],
    'border-radius:var(--rs-radius)!important;overflow:hidden',
  );
  // Player progress and the watched bar on thumbnails.
  css += rule(
    [
      '.ytp-play-progress',
      '.ytp-swatch-background-color',
      '.ytp-scrubber-button',
      'ytd-thumbnail-overlay-resume-playback-renderer #progress',
      '[class*="WatchedProgressBarSegment"]',
    ],
    'background:var(--rs-accent)!important',
  );
  css += rule('.ytp-scrubber-button', 'box-shadow:0 0 0 2px var(--rs-accent-text)');
  return css;
}

function layoutCss(l: Record<string, boolean | string>, strings: LayoutStrings): string {
  let css = rule('html.rs-ambient #cinematics,html.rs-ambient #cinematics-container', 'display:none!important');
  const items = [
    'ytd-rich-item-renderer',
    'ytd-video-renderer',
    'ytd-compact-video-renderer',
    'ytd-grid-video-renderer',
    'yt-lockup-view-model',
  ];
  if (l.logoAccent) {
    const logo = ['#logo-icon', 'ytd-logo', 'ytd-topbar-logo-renderer'];
    css += rule(
      logo.flatMap((s) => [`${s} path[fill="#FF0033"]`, `${s} path[fill="#FF0000"]`, `${s} path[fill="red"]`]),
      'fill:var(--rs-accent,#ff0033)!important',
    );
    css += rule(
      logo.map((s) => `${s} path[fill="white"]`),
      'fill:var(--rs-accent-text,#fff)!important',
    );
  }
  if (l.progressGlow) {
    css += rule(
      '.ytp-play-progress',
      'box-shadow:0 0 12px 1px color-mix(in oklab,var(--rs-accent,#ff0033) 75%,transparent)',
    );
  }
  if (l.gridColumns && l.gridColumns !== 'auto') {
    const n = Number(l.gridColumns);
    css += rule(
      'ytd-rich-grid-renderer',
      `--ytd-rich-grid-items-per-row:${n}!important;--ytd-rich-grid-posts-per-row:${n}!important;--ytd-rich-grid-slim-items-per-row:${n + 1}!important;--ytd-rich-grid-game-cards-per-row:${n}!important`,
    );
  }
  if (l.thumbStyle === 'blur' || l.thumbStyle === 'grayscale') {
    const f = l.thumbStyle === 'blur' ? 'blur(16px) saturate(1.2)' : 'grayscale(1)';
    css += rule(
      THUMBS.map((s) => `${s} img`),
      `filter:${f};transition:filter .25s ease`,
    );
    css += rule(
      items.map((s) => `${s}:hover img`),
      'filter:none!important',
    );
  }
  if (l.dimWatched) {
    const watched = 'ytd-thumbnail-overlay-resume-playback-renderer,[class*="WatchedProgressBarSegment"]';
    css += rule(
      items.map((s) => `${s}:has(${watched})`),
      'opacity:.42;transition:opacity .2s ease',
    );
    css += rule(
      items.map((s) => `${s}:has(${watched}):hover`),
      'opacity:1',
    );
  }
  const hidden: string[] = [];
  if (l.hideShorts) {
    hidden.push(
      'ytd-rich-shelf-renderer[is-shorts]',
      'ytd-rich-section-renderer:has(ytd-rich-shelf-renderer[is-shorts])',
      'ytd-reel-shelf-renderer',
      'grid-shelf-view-model:has(ytm-shorts-lockup-view-model)',
      'ytd-guide-entry-renderer:has(a[title="Shorts"])',
      'ytd-guide-entry-renderer:has(a[href^="/shorts"])',
      'ytd-mini-guide-entry-renderer:has(a[title="Shorts"])',
      'ytd-mini-guide-entry-renderer[aria-label="Shorts"]',
      ...items.map((s) => `${s}:has(a[href^="/shorts/"])`),
    );
  }
  if (l.hideHomeFeed) {
    hidden.push('ytd-browse[page-subtype="home"] ytd-rich-grid-renderer');
    css += rule(
      'ytd-browse[page-subtype="home"] ytd-two-column-browse-results-renderer::before',
      `content:${JSON.stringify(strings.homeHidden)};display:block;margin:18vh auto 0;max-width:520px;text-align:center;font-size:1.8rem;line-height:1.5;color:var(--rs-muted,var(--yt-sys-color-baseline--text-secondary))`,
    );
  }
  if (l.hideRelated) hidden.push('ytd-watch-flexy #related');
  if (l.hideComments) hidden.push('ytd-watch-flexy #comments', 'ytd-comments#comments');
  if (l.hideEndCards) {
    hidden.push(
      '.ytp-ce-element',
      '.ytp-endscreen-content',
      '.ytp-cards-teaser',
      '.ytp-cards-button',
      '.iv-branding',
      '.ytp-suggested-action',
    );
  }
  if (l.hideChips) hidden.push('ytd-feed-filter-chip-bar-renderer', 'yt-related-chip-cloud-renderer');
  if (l.hideMerch) hidden.push('ytd-merch-shelf-renderer', 'ytd-ticket-shelf-renderer');
  if (l.hideExplore) {
    hidden.push(
      'ytd-guide-section-renderer:has(a[href^="/gaming"])',
      'ytd-guide-section-renderer:has(a[href*="music.youtube.com"])',
    );
  }
  return css + hide(hidden);
}

export const youtube: SiteAdapter = {
  id: 'youtube',
  backdrop: true,
  engine: {
    accept: /^--(yt-sys-color-baseline--|yt-spec-|t[0-9a-f]{16}$|ytd-searchbox-)/,
    exclude: /overlay|static|scrim|ad-yellow|shadow|error|warning|complete|themed|add-on|purple|magenta/,
    semantic:
      /^--yt-sys-color-baseline--(base|raised|menu|text|tonal|additive|outline|call-to-action|mono|touch|surface|solid|frosted)/,
    rootSelectors: ROOTS,
    brand: [
      { color: '#ff0033', tolerance: 24 },
      { color: '#ff0000', tolerance: 24 },
    ],
    link: [
      { color: '#065fd4', tolerance: 26 },
      { color: '#3ea6ff', tolerance: 26 },
    ],
    anchors: {
      bg: `${SYS}base-background`,
      text: `${SYS}text-primary`,
      surface: `${SYS}tonal-background`,
      muted: `${SYS}text-secondary`,
    },
  },
  themeCss,
  layoutCss,
  fontExclude: ['.ytp-caption-segment', '.caption-visual-line *', '.ytp-caption-window-container *'],
};
