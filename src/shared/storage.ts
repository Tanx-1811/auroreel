/**
 * chrome.storage.local access. Keys:
 * - rs:settings — Settings (parseSettings on every read)
 * - rs:themes   — custom themes (parseTheme on every read)
 * - rs:speed    — last playback speed per platform
 * - rs:engine:<platform>:<mode> — the recolouring engine's cache of a site's palette
 */
import { parseSettings, type Settings } from '../core/settings.ts';
import { parseTheme, type Theme } from '../core/themes.ts';
import type { PlatformId } from '../core/platforms.ts';

export const SETTINGS_KEY = 'rs:settings';
export const THEMES_KEY = 'rs:themes';
export const SPEED_KEY = 'rs:speed';
export const engineKey = (platform: PlatformId, mode: string) => `rs:engine:${platform}:${mode}`;

export function parseThemes(raw: unknown): Theme[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  return raw.flatMap((r) => {
    const t = parseTheme(r);
    if (!t || seen.has(t.id)) return [];
    seen.add(t.id);
    return [t];
  });
}

export interface StoreState {
  settings: Settings;
  themes: Theme[];
}

export async function loadState(): Promise<StoreState> {
  const got = await chrome.storage.local.get([SETTINGS_KEY, THEMES_KEY]);
  return { settings: parseSettings(got[SETTINGS_KEY]), themes: parseThemes(got[THEMES_KEY]) };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

/** Read-modify-write of the settings (callers in different pages never hold stale copies for long). */
export async function updateSettings(fn: (s: Settings) => Settings): Promise<Settings> {
  const got = await chrome.storage.local.get(SETTINGS_KEY);
  const next = fn(parseSettings(got[SETTINGS_KEY]));
  await saveSettings(next);
  return next;
}

export async function saveThemes(themes: Theme[]): Promise<void> {
  await chrome.storage.local.set({ [THEMES_KEY]: themes });
}

export async function upsertTheme(theme: Theme): Promise<void> {
  const { themes } = await loadState();
  const i = themes.findIndex((t) => t.id === theme.id);
  const next = i >= 0 ? themes.map((t) => (t.id === theme.id ? theme : t)) : [theme, ...themes];
  await saveThemes(next);
}

export async function deleteTheme(id: string): Promise<void> {
  const { themes } = await loadState();
  await saveThemes(themes.filter((t) => t.id !== id));
}

export async function loadSpeeds(): Promise<Partial<Record<PlatformId, number>>> {
  const got = await chrome.storage.local.get(SPEED_KEY);
  const raw = got[SPEED_KEY];
  return raw && typeof raw === 'object' ? (raw as Partial<Record<PlatformId, number>>) : {};
}

export async function saveSpeed(platform: PlatformId, speed: number): Promise<void> {
  const speeds = await loadSpeeds();
  await chrome.storage.local.set({ [SPEED_KEY]: { ...speeds, [platform]: speed } });
}
