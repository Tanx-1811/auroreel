import type { Settings } from '../core/settings.ts';
import type { Theme } from '../core/themes.ts';

export interface PageProps {
  settings: Settings;
  themes: Theme[];
  update: (fn: (s: Settings) => Settings) => Promise<unknown>;
  saveTheme: (t: Theme) => Promise<void>;
  removeTheme: (id: string) => Promise<void>;
}
