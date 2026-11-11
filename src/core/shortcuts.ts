/**
 * On-page keyboard shortcuts. A shortcut is stored as "Alt+Shift+KeyC":
 * modifiers in a fixed order, then a KeyboardEvent.code (layout independent,
 * so Alt+letter works on macOS where Alt changes the typed character).
 */

export type ActionId =
  | 'speedUp'
  | 'speedDown'
  | 'speedReset'
  | 'rewind'
  | 'advance'
  | 'cinema'
  | 'ambient'
  | 'filters'
  | 'screenshot'
  | 'pip'
  | 'loop'
  | 'toggleSkin';

export const ACTION_IDS: ActionId[] = [
  'speedUp',
  'speedDown',
  'speedReset',
  'rewind',
  'advance',
  'cinema',
  'ambient',
  'filters',
  'screenshot',
  'pip',
  'loop',
  'toggleSkin',
];

/** Same keys as the popular speed-controller extensions for speed; Alt+letter for the rest. */
export const DEFAULT_SHORTCUTS: Record<ActionId, string | null> = {
  speedUp: 'KeyD',
  speedDown: 'KeyS',
  speedReset: 'KeyR',
  rewind: 'KeyZ',
  advance: 'KeyX',
  cinema: 'Alt+KeyC',
  ambient: 'Alt+KeyA',
  filters: 'Alt+KeyF',
  screenshot: 'Alt+KeyS',
  pip: 'Alt+KeyP',
  loop: 'Alt+KeyL',
  toggleSkin: 'Alt+KeyT',
};

const MODS = ['Ctrl', 'Alt', 'Shift', 'Meta'] as const;
type Mod = (typeof MODS)[number];

export interface Shortcut {
  mods: Set<Mod>;
  code: string;
}

const CODE =
  /^(Key[A-Z]|Digit\d|F([1-9]|1[0-2])|Comma|Period|Slash|Semicolon|Quote|BracketLeft|BracketRight|Backslash|Minus|Equal|Backquote|Arrow(Up|Down|Left|Right))$/;

export function parseShortcut(s: string): Shortcut | null {
  const parts = s.split('+');
  const code = parts.pop();
  if (!code || !CODE.test(code)) return null;
  const mods = new Set<Mod>();
  for (const p of parts) {
    if (!MODS.includes(p as Mod) || mods.has(p as Mod)) return null;
    mods.add(p as Mod);
  }
  return { mods, code };
}

export interface KeyLike {
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
}

/** Shortcut string for a key press, or null for a bare modifier / unsupported key. */
export function shortcutFromEvent(e: KeyLike): string | null {
  if (!CODE.test(e.code)) return null;
  const mods: string[] = [];
  if (e.ctrlKey) mods.push('Ctrl');
  if (e.altKey) mods.push('Alt');
  if (e.shiftKey) mods.push('Shift');
  if (e.metaKey) mods.push('Meta');
  return [...mods, e.code].join('+');
}

export function matches(shortcut: string | null, e: KeyLike): boolean {
  if (!shortcut) return false;
  return shortcutFromEvent(e) === shortcut;
}

/** Human label: "Alt + C", "⌥ C" on macOS. */
export function formatShortcut(s: string | null, mac = false): string {
  if (!s) return '—';
  const sc = parseShortcut(s);
  if (!sc) return '—';
  const macMods: Record<Mod, string> = { Ctrl: '⌃', Alt: '⌥', Shift: '⇧', Meta: '⌘' };
  const key = sc.code
    .replace(/^Key/, '')
    .replace(/^Digit/, '')
    .replace(/^Arrow(Up|Down|Left|Right)$/, (_, d: string) => ({ Up: '↑', Down: '↓', Left: '←', Right: '→' })[d]!)
    .replace('BracketLeft', '[')
    .replace('BracketRight', ']')
    .replace('Comma', ',')
    .replace('Period', '.')
    .replace('Slash', '/')
    .replace('Semicolon', ';')
    .replace('Quote', "'")
    .replace('Backslash', '\\')
    .replace('Minus', '-')
    .replace('Equal', '=')
    .replace('Backquote', '`');
  const mods = MODS.filter((m) => sc.mods.has(m));
  return mac ? [...mods.map((m) => macMods[m]), key].join(' ') : [...mods, key].join(' + ');
}

/** Actions that share a key with another action. */
export function conflicts(map: Record<ActionId, string | null>): Set<ActionId> {
  const seen = new Map<string, ActionId>();
  const out = new Set<ActionId>();
  for (const id of ACTION_IDS) {
    const k = map[id];
    if (!k) continue;
    const prev = seen.get(k);
    if (prev) {
      out.add(prev);
      out.add(id);
    } else seen.set(k, id);
  }
  return out;
}
