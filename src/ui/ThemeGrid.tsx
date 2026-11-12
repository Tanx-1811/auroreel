import { Check, Heart, Moon, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import { NO_THEME, themeName, type Theme } from '../core/themes.ts';
import { useLang, useT } from './i18n.tsx';
import { MiniPreview } from './ThemePreview.tsx';

export type ThemeFilter = 'all' | 'fav' | 'dark' | 'light' | 'mine';

/** Filters by tab and search text (English and Vietnamese names); favourites come first. */
export function filterThemes(themes: Theme[], filter: ThemeFilter, favorites: string[] = [], query = ''): Theme[] {
  const fav = new Set(favorites);
  const q = query.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const plain = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  let list = themes.filter((t) => {
    if (filter === 'fav' && !fav.has(t.id)) return false;
    if (filter === 'mine' && t.builtIn) return false;
    if ((filter === 'dark' || filter === 'light') && t.mode !== filter) return false;
    if (q && !plain(`${t.name} ${t.nameVi ?? ''}`).includes(q)) return false;
    return true;
  });
  if (fav.size) list = [...list.filter((t) => fav.has(t.id)), ...list.filter((t) => !fav.has(t.id))];
  return list;
}

/** "Site colours": keeps the site's own palette. */
function OriginalCard({ active, onPick }: { active: boolean; onPick: () => void }) {
  const t = useT();
  return (
    <div className="theme-cell">
      <button type="button" className="theme-card" aria-pressed={active} onClick={onPick}>
        <div className="tp original" aria-hidden="true">
          <div className="tp-original-inner">
            <span>{t('themes.original')}</span>
          </div>
        </div>
        {active ? (
          <span className="check">
            <Check size={14} strokeWidth={3} />
          </span>
        ) : null}
        <span className="name">
          <span>{t('themes.original')}</span>
        </span>
      </button>
    </div>
  );
}

export function ThemeGrid({
  themes,
  activeId,
  onPick,
  showOriginal = true,
  favorites,
  onFavorite,
  extra,
}: {
  themes: Theme[];
  activeId: string;
  onPick: (id: string) => void;
  showOriginal?: boolean;
  favorites?: string[];
  onFavorite?: (id: string) => void;
  extra?: (theme: Theme) => ReactNode;
}) {
  const lang = useLang();
  const t = useT();
  const fav = new Set(favorites ?? []);
  return (
    <div className="theme-grid">
      {themes.map((theme) => {
        const active = theme.id === activeId;
        const name = themeName(theme, lang);
        const isFav = fav.has(theme.id);
        return (
          <div key={theme.id} className="theme-cell">
            <button
              type="button"
              className="theme-card"
              aria-pressed={active}
              aria-label={t('themes.useNamed', { name })}
              onClick={() => onPick(theme.id)}
              data-theme-id={theme.id}
            >
              <MiniPreview theme={theme} />
              {active ? (
                <span className="check">
                  <Check size={14} strokeWidth={3} />
                </span>
              ) : null}
              <span className="name">
                <span className="name-text">
                  {theme.mode === 'dark' ? (
                    <Moon size={12} aria-label={t('themes.dark')} />
                  ) : (
                    <Sun size={12} aria-label={t('themes.light')} />
                  )}
                  <span>{name}</span>
                </span>
                {!theme.builtIn ? <span className="badge acc">{t('themes.mineBadge')}</span> : null}
              </span>
            </button>
            {onFavorite ? (
              <button
                type="button"
                className={`fav-btn${isFav ? ' on' : ''}`}
                aria-pressed={isFav}
                aria-label={t(isFav ? 'themes.unfavorite' : 'themes.favorite', { name })}
                title={t(isFav ? 'themes.unfavorite' : 'themes.favorite', { name })}
                onClick={() => onFavorite(theme.id)}
              >
                <Heart size={14} fill={isFav ? 'currentColor' : 'none'} />
              </button>
            ) : null}
            {extra?.(theme)}
          </div>
        );
      })}
      {showOriginal ? <OriginalCard active={activeId === NO_THEME} onPick={() => onPick(NO_THEME)} /> : null}
    </div>
  );
}

/** Adds or removes a favourite. */
export function toggleFavorite(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [id, ...list];
}
