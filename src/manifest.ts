import pkg from '../package.json' with { type: 'json' };
import { ALL_MATCHES, CSS_HOSTS } from './core/platforms.ts';

/**
 * Builds manifest.json at build time so the version always matches package.json.
 *
 * Permissions (see docs/PRIVACY.md):
 * - Host access to the supported streaming sites only (ALL_MATCHES): the content
 *   script restyles those pages and adds the player tools. Chrome shows
 *   "Read and change your data on www.youtube.com, www.twitch.tv and 7 other sites".
 * - CSS_HOSTS (a site's stylesheet CDN that blocks cross-origin reads, e.g. *.vieon.vn):
 *   the service worker fetches those stylesheets so the theme engine can read their colours.
 * - storage: settings and custom themes stay on this device.
 * - scripting: registers the content script for "player tools on every site",
 *   only after the user grants the optional all-sites permission.
 * Nothing is sent anywhere; there is no server.
 */
export function createManifest(mode: string): chrome.runtime.ManifestV3 {
  const testHosts = mode === 'e2e' ? ['http://127.0.0.1/*', 'http://localhost/*'] : [];
  const matches = [...ALL_MATCHES, ...testHosts];
  const manifest: chrome.runtime.ManifestV3 = {
    manifest_version: 3,
    name: '__MSG_extName__',
    short_name: 'Auroreel',
    version: pkg.version,
    description: '__MSG_extDescription__',
    // Open source (MIT): Chrome links "Visit website" here.
    homepage_url: 'https://github.com/Tanx-1811/auroreel',
    default_locale: 'en',
    // scrollbar-color, color-mix(), :has() and clip-path: path(evenodd, …).
    minimum_chrome_version: '121',
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    action: {
      default_title: '__MSG_actionTitle__',
      default_popup: 'popup/popup.html',
      default_icon: { 16: 'icons/icon-16.png', 32: 'icons/icon-32.png' },
    },
    options_ui: { page: 'options/options.html', open_in_tab: true },
    background: { service_worker: 'service-worker.js', type: 'module' },
    permissions: ['storage', 'scripting'],
    host_permissions: [...matches, ...CSS_HOSTS],
    optional_host_permissions: ['https://*/*', 'http://*/*'],
    content_scripts: [
      { matches, js: ['content.js'], run_at: 'document_start' },
      // YouTube's player API (default quality) is only reachable from the page's own world.
      {
        matches: ['https://www.youtube.com/*'],
        js: ['youtube-main.js'],
        run_at: 'document_idle',
        world: 'MAIN',
      },
      // YouTube's live chat lives in its own frame.
      {
        matches: ['https://www.youtube.com/live_chat*', 'https://www.youtube.com/live_chat_replay*'],
        js: ['content.js'],
        run_at: 'document_start',
        all_frames: true,
      },
    ],
    web_accessible_resources: [{ resources: ['fonts/*.woff2'], matches }],
    commands: {
      _execute_action: { suggested_key: { default: 'Alt+Shift+R' }, description: '__MSG_commandOpen__' },
      'toggle-cinema': { suggested_key: { default: 'Alt+Shift+C' }, description: '__MSG_commandCinema__' },
      'toggle-skin': { suggested_key: { default: 'Alt+Shift+T' }, description: '__MSG_commandSkin__' },
      'next-theme': { suggested_key: { default: 'Alt+Shift+N' }, description: '__MSG_commandNextTheme__' },
    },
  };
  if (mode === 'e2e') {
    // Automated tests can't click Chrome's permission prompt: grant everything up front.
    manifest.host_permissions = ['<all_urls>'];
  }
  return manifest;
}
