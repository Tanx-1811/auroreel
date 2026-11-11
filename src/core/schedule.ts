/** Automatic light/dark theme switching. */
import type { Settings } from './settings.ts';
import { siteThemeId } from './settings.ts';
import type { PlatformId } from './platforms.ts';

const minutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

/** True when `now` falls in the day window [dayStart, nightStart) — the window may wrap midnight. */
export function isDaytime(dayStart: string, nightStart: string, now: Date): boolean {
  const t = now.getHours() * 60 + now.getMinutes();
  const a = minutes(dayStart);
  const b = minutes(nightStart);
  if (a === b) return true;
  return a < b ? t >= a && t < b : t >= a || t < b;
}

/**
 * The theme a site shows right now. A theme chosen for one site wins over the
 * schedule; otherwise the schedule (system appearance or time of day) picks
 * between the light and dark themes.
 */
export function activeThemeId(settings: Settings, platform: PlatformId, now: Date, systemDark: boolean): string {
  const own = settings.sites[platform]?.themeId;
  if (own) return own;
  const s = settings.schedule;
  if (s.mode === 'system') return systemDark ? s.darkThemeId : s.lightThemeId;
  if (s.mode === 'time') return isDaytime(s.dayStart, s.nightStart, now) ? s.lightThemeId : s.darkThemeId;
  return siteThemeId(settings, platform);
}

/** Milliseconds until the next day/night boundary (for re-evaluating the schedule). */
export function msUntilNextSwitch(dayStart: string, nightStart: string, now: Date): number {
  const t = now.getHours() * 60 + now.getMinutes();
  const next = [minutes(dayStart), minutes(nightStart)]
    .map((m) => (m > t ? m - t : m + 1440 - t))
    .reduce((a, b) => Math.min(a, b));
  return Math.max(1000, next * 60_000 - now.getSeconds() * 1000 - now.getMilliseconds());
}
