import { Check } from 'lucide-react';
import { NO_THEME, themeName, type Theme } from '../core/themes.ts';
import { useLang, useT } from './i18n.tsx';
import { MiniPreview } from './ThemePreview.tsx';

export type ThemeFilter = 'all' | 'dark' | 'light' | 'mine';

export function filterThemes(themes: Theme[], filter: ThemeFilter): Theme[] {
  if (filter === 'mine') return themes.filter((t) => !t.builtIn);
  if (filter === 'dark' || filter === 'light') return themes.filter((t) => t.mode === filter);
  return themes;
}

/** "Site colours": keeps the site's own palette. */
function OriginalCard({ active, onPick }: { active: boolean; onPick: () => void }) {
  const t = useT();
  return (
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
  );
}

export function ThemeGrid({
  themes,
  activeId,
  onPick,
  showOriginal = true,
  extra,
}: {
  themes: Theme[];
  activeId: string;
  onPick: (id: string) => void;
  showOriginal?: boolean;
  extra?: (theme: Theme) => React.ReactNode;
}) {
  const lang = useLang();
  const t = useT();
  return (
    <div className="theme-grid">
      {themes.map((theme) => {
        const active = theme.id === activeId;
        const name = themeName(theme, lang);
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
                <span>{name}</span>
                {!theme.builtIn ? <span className="badge acc">{t('themes.mineBadge')}</span> : null}
              </span>
            </button>
            {extra?.(theme)}
          </div>
        );
      })}
      {showOriginal ? <OriginalCard active={activeId === NO_THEME} onPick={() => onPick(NO_THEME)} /> : null}
    </div>
  );
}
