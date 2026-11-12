/**
 * YouTube only, in the page's own world (MAIN): asks YouTube's player for the
 * default quality the user picked. The isolated content script publishes the
 * choice as `<html data-rs-quality="1080">`; this script only reads that
 * attribute and calls the player — it never touches storage or the extension.
 */
interface YtPlayer extends HTMLElement {
  getAvailableQualityLevels?: () => string[];
  getPlaybackQuality?: () => string;
  setPlaybackQualityRange?: (min: string, max?: string) => void;
  setPlaybackQuality?: (q: string) => void;
}

const ORDER = ['hd2160', 'hd1440', 'hd1080', 'hd720', 'large', 'medium', 'small', 'tiny'];
const LABEL: Record<string, string> = {
  '2160': 'hd2160',
  '1440': 'hd1440',
  '1080': 'hd1080',
  '720': 'hd720',
  '480': 'large',
};

function apply() {
  const want = LABEL[document.documentElement.dataset.rsQuality ?? ''];
  if (!want) return;
  const player = document.getElementById('movie_player') as YtPlayer | null;
  const levels = (player?.getAvailableQualityLevels?.() ?? []).filter((l) => ORDER.includes(l));
  if (!player || !levels.length) return;
  // The best available quality that isn't above the choice (or the lowest there is).
  const target = ORDER.indexOf(want);
  const pick = levels.find((l) => ORDER.indexOf(l) >= target) ?? levels[levels.length - 1]!;
  if (player.getPlaybackQuality?.() === pick) return;
  try {
    player.setPlaybackQualityRange?.(pick, pick);
    player.setPlaybackQuality?.(pick);
  } catch {
    // YouTube changed its player API: nothing to do but leave the quality alone.
  }
}

function soon() {
  for (const ms of [300, 1500, 4000]) setTimeout(apply, ms);
}

document.addEventListener('yt-navigate-finish', soon);
document.addEventListener('loadeddata', soon, true);
new MutationObserver(soon).observe(document.documentElement, {
  attributes: true,
  attributeFilter: ['data-rs-quality'],
});
soon();
