import { en, type MessageKey } from '../i18n/en.ts';
import { vi } from '../i18n/vi.ts';

export type Lang = 'en' | 'vi';
export type { MessageKey };
export type Vars = Record<string, string | number>;

export function resolveLang(pref: 'auto' | Lang): Lang {
  if (pref !== 'auto') return pref;
  let ui: string;
  try {
    ui = chrome.i18n?.getUILanguage?.() ?? navigator.language;
  } catch {
    ui = navigator.language;
  }
  return ui.toLowerCase().startsWith('vi') ? 'vi' : 'en';
}

export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  let s: string = (lang === 'vi' ? vi[key] : undefined) ?? en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
