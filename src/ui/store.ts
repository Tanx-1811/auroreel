import { useCallback, useEffect, useState } from 'react';
import type { Settings } from '../core/settings.ts';
import type { Theme } from '../core/themes.ts';
import {
  deleteTheme,
  loadState,
  SETTINGS_KEY,
  THEMES_KEY,
  updateSettings,
  upsertTheme,
  type StoreState,
} from '../shared/storage.ts';

/** Settings and custom themes, kept in sync with storage (changes from any page show up live). */
export function useStore() {
  const [state, setState] = useState<StoreState | null>(null);

  useEffect(() => {
    let alive = true;
    const load = () =>
      void loadState().then((s) => {
        if (alive) setState(s);
      });
    load();
    const onChange = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && (changes[SETTINGS_KEY] || changes[THEMES_KEY])) load();
    };
    chrome.storage.onChanged.addListener(onChange);
    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(onChange);
    };
  }, []);

  const update = useCallback((fn: (s: Settings) => Settings) => {
    setState((prev) => (prev ? { ...prev, settings: fn(prev.settings) } : prev));
    return updateSettings(fn);
  }, []);

  const saveTheme = useCallback((theme: Theme) => {
    setState((prev) => {
      if (!prev) return prev;
      const exists = prev.themes.some((t) => t.id === theme.id);
      return {
        ...prev,
        themes: exists ? prev.themes.map((t) => (t.id === theme.id ? theme : t)) : [theme, ...prev.themes],
      };
    });
    return upsertTheme(theme);
  }, []);

  const removeTheme = useCallback((id: string) => {
    setState((prev) => (prev ? { ...prev, themes: prev.themes.filter((t) => t.id !== id) } : prev));
    return deleteTheme(id);
  }, []);

  return { state, update, saveTheme, removeTheme };
}

/** Value that follows `value` but lets a control change it locally and commit later (sliders). */
export function useDraft<T>(value: T, commit: (v: T) => void, delay = 140): [T, (v: T) => void] {
  const [draft, setDraft] = useState(value);
  const [dirty, setDirty] = useState(false);
  const [prev, setPrev] = useState(value);
  if (!dirty && value !== prev) {
    setPrev(value);
    setDraft(value);
  }
  useEffect(() => {
    if (!dirty) return;
    const id = setTimeout(() => {
      commit(draft);
      setDirty(false);
    }, delay);
    return () => clearTimeout(id);
  }, [draft, dirty, commit, delay]);
  return [
    draft,
    (v: T) => {
      setDraft(v);
      setDirty(true);
    },
  ];
}
