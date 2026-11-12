/**
 * Twitch (www.twitch.tv). Palette tokens: `--color-*`, scoped to
 * .tw-root--theme-dark / .tw-root--theme-light (2026-11).
 */
import { hasBackdrop, hide, rule, type CssContext } from '../css/common.ts';
import type { SiteAdapter } from './types.ts';

const ROOTS = [':root', '.tw-root--theme-dark', '.tw-root--theme-light'];

function themeCss({ theme }: CssContext): string {
  const glass = hasBackdrop(theme);
  const v: Record<string, string> = {
    'background-body': 'var(--rs-page)',
    'background-base': glass ? 'var(--rs-glass-bg)' : 'var(--rs-bg)',
    'background-alt': 'var(--rs-surface)',
    'background-alt-2': 'var(--rs-surface-2)',
    'text-base': 'var(--rs-text)',
    'text-alt': 'var(--rs-muted)',
    'text-alt-2': 'var(--rs-muted)',
    'text-link': 'var(--rs-link)',
    'text-link-hover': 'var(--rs-link)',
    accent: 'var(--rs-accent)',
    'background-accent': 'var(--rs-accent)',
    'background-brand': 'var(--rs-accent)',
    'background-button-primary-default': 'var(--rs-accent)',
    'background-button-primary-hover': 'color-mix(in oklab,var(--rs-accent) 85%,var(--rs-text))',
    'text-button-primary': 'var(--rs-accent-text)',
    'border-base': 'var(--rs-border)',
  };
  let css = rule(
    ROOTS,
    Object.entries(v)
      .map(([k, val]) => `--color-${k}:${val}!important`)
      .join(';'),
  );
  if (glass) {
    css += rule(['#root', '.twilight-main', '.root-scrollable', 'main'], 'background:transparent!important');
    css += rule(
      ['nav[data-a-target="top-nav-container"]', '.top-nav__menu'],
      'background:var(--rs-glass-bg)!important;backdrop-filter:blur(20px) saturate(1.4)',
    );
    css += rule(
      ['.side-nav', '[data-a-target="side-nav-bar"]', '.side-bar-contents'],
      'background:var(--rs-glass-bg)!important;backdrop-filter:blur(20px)',
    );
  }
  css += rule(
    ['.tw-image', '.preview-card-image-link img', 'article img.tw-image', '[class*="ScCoreLink"] .tw-aspect img'],
    'border-radius:var(--rs-radius)!important',
  );
  // Twitch's light look hard-codes these (not tokens): near-black nav text, white carousel panels.
  css += rule('.navigation-link', 'color:var(--rs-text)!important');
  css += rule(['.navigation-link.active', '.navigation-link:hover'], 'color:var(--rs-accent)!important');
  css += rule(
    ['.carousel-metadata', '.carousel-player-nav-arrow__container'],
    'background:var(--rs-surface)!important;color:var(--rs-text)!important',
  );
  css += rule(
    '.carousel-metadata--fadeout',
    'background:linear-gradient(transparent,color-mix(in oklab,var(--rs-surface) 90%,transparent) 75%,var(--rs-surface) 80%)!important',
  );
  // Category tiles sit on the accent: their text follows the accent's own text colour.
  css += rule(['.vertical-selector', '.vertical-selector *'], 'color:var(--rs-accent-text)!important');
  css += rule(
    ['[data-a-target="player-seekbar"] [data-test-selector="seekbar-segment__segment"]', '.seekbar-bar > div'],
    'background:var(--rs-accent)!important',
  );
  return css;
}

function layoutCss(l: Record<string, boolean | string>): string {
  const hidden: string[] = [];
  if (l.hideRecommended) {
    hidden.push(
      '.side-nav-section[aria-label*="ecommended"]',
      '.side-nav-section:has([data-test-selector="recommended-channel"])',
      '[data-a-target="side-nav-header-recommended"]',
    );
  }
  if (l.hideCarousel) hidden.push('.front-page-carousel', '[data-a-target="front-page-carousel"]');
  if (l.hideLeaderboard) {
    hidden.push('.channel-leaderboard', '[data-test-selector="channel-leaderboard-container"]');
  }
  return hide(hidden);
}

export const twitch: SiteAdapter = {
  id: 'twitch',
  backdrop: true,
  engine: {
    accept: /^--color-/,
    exclude:
      /overlay|inverted|static|prime|bits|turbo|snackbar|success|error|warn|info|alert|destructive|live|status|hinted-grey|opac-|brand-accent|deprecated|tooltip|ftue|apple|google|facebook|twitter|button-primary/,
    semantic: /^--color-(background|text|border|fill|twitch-purple|accent)/,
    rootSelectors: ROOTS,
    brand: [{ color: '#9147ff', tolerance: 26 }],
    anchors: {
      bg: '--color-background-body',
      text: '--color-text-base',
      surface: '--color-background-alt',
      muted: '--color-text-alt-2',
    },
  },
  themeCss,
  layoutCss,
  fontExclude: ['.chat-line__message .text-fragment', '[data-a-target="chat-message-text"]'],
};
