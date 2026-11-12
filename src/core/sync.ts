/**
 * Chrome Sync of settings and custom themes (opt-in). chrome.storage.sync is
 * small (8 KB per item, 100 KB in all), so:
 * - settings travel without the per-device fields (all-sites permission,
 *   onboarding, the sync switch itself);
 * - each theme is its own item; themes with a picture backdrop stay on the
 *   device that has the picture;
 * - deletions travel as tombstones so a theme removed on one computer doesn't
 *   come back from another.
 */
import { parseSettings, type Settings } from './settings.ts';
import { parseTheme, type Theme } from './themes.ts';

export const SYNC_SETTINGS = 'rs:sync:settings';
export const SYNC_DELETED = 'rs:sync:deleted';
export const SYNC_THEME_PREFIX = 'rs:sync:theme:';
export const SYNC_ITEM_MAX = 8000;
export const SYNC_MAX_THEMES = 60;
const TOMBSTONE_DAYS = 120;

/** Fields that stay on each device (plus the knob picture, `progress.image`: too big for a sync item). */
type LocalOnly = 'anySite' | 'onboarded' | 'sync';

export interface SyncedSettings {
  from: string;
  at: number;
  settings: Omit<Settings, LocalOnly>;
}

export function toSynced(settings: Settings, from: string, at: number): SyncedSettings {
  const { anySite: _a, onboarded: _o, sync: _s, ...rest } = settings;
  return { from, at, settings: { ...rest, progress: { ...rest.progress, image: '' } } };
}

/** Applies synced settings on this device, keeping its local-only fields. */
export function applySynced(local: Settings, remote: unknown): Settings {
  if (!remote || typeof remote !== 'object') return local;
  const incoming = (remote as Partial<SyncedSettings>).settings;
  if (!incoming || typeof incoming !== 'object') return local;
  const progress = (incoming as { progress?: unknown }).progress;
  return parseSettings({
    ...incoming,
    progress: progress && typeof progress === 'object' ? { ...progress, image: local.progress.image } : progress,
    anySite: local.anySite,
    onboarded: local.onboarded,
    sync: local.sync,
  });
}

/** Themes that fit in Chrome Sync (no picture backdrop, small enough), newest first. */
export function syncableThemes(themes: Theme[]): Theme[] {
  return themes
    .filter((t) => !t.builtIn && t.backdrop.kind !== 'image' && JSON.stringify(t).length < SYNC_ITEM_MAX - 200)
    .slice(0, SYNC_MAX_THEMES);
}

export type Tombstones = Record<string, number>;

export function pruneTombstones(t: Tombstones, now: number): Tombstones {
  const limit = now - TOMBSTONE_DAYS * 86_400_000;
  return Object.fromEntries(Object.entries(t).filter(([, at]) => typeof at === 'number' && at > limit));
}

/**
 * Local themes after receiving the synced ones: synced themes are added or
 * replace local copies; themes deleted elsewhere are removed; picture themes
 * (never synced) stay.
 */
export function mergeSyncedThemes(local: Theme[], remoteRaw: unknown[], deleted: Tombstones): Theme[] {
  const remote = remoteRaw.map(parseTheme).filter((t): t is Theme => !!t);
  const ids = new Set(remote.map((t) => t.id));
  const kept = local.filter((t) => !ids.has(t.id) && !(t.id in deleted));
  return [...remote, ...kept];
}

/** Plans the writes that bring Chrome Sync up to date with this device's themes. */
export function planThemePush(
  local: Theme[],
  remote: Record<string, string>,
  deleted: Tombstones,
  now: number,
): { set: Record<string, Theme>; remove: string[]; deleted: Tombstones } {
  const want = syncableThemes(local);
  const set: Record<string, Theme> = {};
  for (const t of want) {
    const key = SYNC_THEME_PREFIX + t.id;
    if (remote[key] !== JSON.stringify(t)) set[key] = t;
  }
  const wanted = new Set(want.map((t) => SYNC_THEME_PREFIX + t.id));
  const localIds = new Set(local.map((t) => t.id));
  const remove: string[] = [];
  const nextDeleted = { ...deleted };
  for (const key of Object.keys(remote)) {
    if (wanted.has(key)) continue;
    remove.push(key);
    const id = key.slice(SYNC_THEME_PREFIX.length);
    // Gone from this device (deleted), not merely too big to sync: remember the deletion.
    if (!localIds.has(id)) nextDeleted[id] = now;
  }
  for (const t of want) delete nextDeleted[t.id];
  return { set, remove, deleted: pruneTombstones(nextDeleted, now) };
}
