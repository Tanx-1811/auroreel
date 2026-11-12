/** Backup files: settings plus custom themes in one JSON document. */
import { parseSettings, type Settings } from './settings.ts';
import { parseTheme, type Theme } from './themes.ts';

export const BACKUP_KIND = 'auroreel-backup';

export interface Backup {
  kind: typeof BACKUP_KIND;
  version: 1;
  exportedAt: string;
  settings: Settings;
  themes: Theme[];
}

export function makeBackup(settings: Settings, themes: Theme[], now = new Date()): Backup {
  return { kind: BACKUP_KIND, version: 1, exportedAt: now.toISOString(), settings, themes };
}

/** A single shared theme file. */
export const THEME_KIND = 'auroreel-theme';

export function makeThemeFile(theme: Theme) {
  const { builtIn: _b, ...rest } = theme;
  return { kind: THEME_KIND, version: 1, theme: rest };
}

export type ParsedImport =
  { type: 'backup'; settings: Settings; themes: Theme[] } | { type: 'theme'; theme: Theme } | { type: 'invalid' };

export function parseImport(text: string): ParsedImport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { type: 'invalid' };
  }
  if (!raw || typeof raw !== 'object') return { type: 'invalid' };
  const r = raw as Record<string, unknown>;
  if (r.kind === BACKUP_KIND) {
    const themes = Array.isArray(r.themes) ? r.themes.map(parseTheme).filter((t): t is Theme => !!t) : [];
    return { type: 'backup', settings: parseSettings(r.settings), themes };
  }
  if (r.kind === THEME_KIND) {
    const theme = parseTheme(r.theme);
    return theme ? { type: 'theme', theme } : { type: 'invalid' };
  }
  return { type: 'invalid' };
}

/** Imported themes join the existing ones; ids that already exist are replaced. */
export function mergeThemes(existing: Theme[], incoming: Theme[]): Theme[] {
  const ids = new Set(incoming.map((t) => t.id));
  return [...incoming, ...existing.filter((t) => !ids.has(t.id))];
}
