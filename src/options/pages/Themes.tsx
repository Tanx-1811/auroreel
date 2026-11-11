import { Copy, Download, ImagePlus, Pencil, Plus, Trash2, Upload } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { makeThemeFile, mergeThemes, parseImport } from '../../core/backup.ts';
import { allThemes, duplicateTheme, newThemeId, themeName, type Theme } from '../../core/themes.ts';
import { saveThemes } from '../../shared/storage.ts';
import { Segmented } from '../../ui/controls.tsx';
import { useLang, useT } from '../../ui/i18n.tsx';
import { filterThemes, ThemeGrid, type ThemeFilter } from '../../ui/ThemeGrid.tsx';
import { useToast } from '../../ui/toast.tsx';
import { PageHead } from '../PageHead.tsx';
import { go } from '../router.ts';
import type { PageProps } from '../types.ts';
import { downloadJson, readFileText } from '../files.ts';

export function ThemesPage({ settings, themes, update, saveTheme, removeTheme }: PageProps) {
  const t = useT();
  const lang = useLang();
  const toast = useToast();
  const [filter, setFilter] = useState<ThemeFilter>('all');
  const fileRef = useRef<HTMLInputElement>(null);
  const list = useMemo(() => filterThemes(allThemes(themes), filter), [themes, filter]);
  const scheduled = settings.schedule.mode !== 'off';

  const use = (id: string) => {
    void update((s) => ({ ...s, themeId: id }));
    const theme = allThemes(themes).find((x) => x.id === id);
    toast(t('themes.applied', { name: theme ? themeName(theme, lang) : t('themes.original') }));
  };

  const duplicate = async (theme: Theme) => {
    const copy = duplicateTheme(theme, t('editor.copyOf', { name: themeName(theme, lang) }));
    await saveTheme(copy);
    go(`editor/${copy.id}`);
  };

  const remove = async (theme: Theme) => {
    if (!confirm(t('themes.deleteConfirm', { name: theme.name }))) return;
    await removeTheme(theme.id);
    if (settings.themeId === theme.id) void update((s) => ({ ...s, themeId: 'midnight-velvet' }));
    toast(t('themes.deleted'));
  };

  const importFile = async (file: File) => {
    const parsed = parseImport(await readFileText(file));
    if (parsed.type === 'theme') {
      const theme = themes.some((x) => x.id === parsed.theme.id) ? { ...parsed.theme, id: newThemeId() } : parsed.theme;
      await saveThemes(mergeThemes(themes, [theme]));
      toast(t('themes.imported', { name: theme.name }));
    } else if (parsed.type === 'backup') {
      await saveThemes(mergeThemes(themes, parsed.themes));
      toast(t('backup.importThemesOnly', { n: parsed.themes.length }));
    } else toast(t('backup.importBad'));
  };

  return (
    <>
      <PageHead
        title={t('themes.title')}
        subtitle={t('themes.subtitle')}
        actions={
          <>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              <Upload size={16} />
              {t('themes.importFile')}
            </button>
            <button type="button" className="btn" onClick={() => go('editor/from-image')}>
              <ImagePlus size={16} />
              {t('themes.fromImage')}
            </button>
            <button type="button" className="btn primary" onClick={() => go('editor')}>
              <Plus size={16} />
              {t('themes.create')}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = '';
                if (f) void importFile(f);
              }}
            />
          </>
        }
      />
      <div className="toolbar-row">
        <Segmented
          value={filter}
          label={t('themes.filter')}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('themes.all') },
            { value: 'dark', label: t('themes.dark') },
            { value: 'light', label: t('themes.light') },
            { value: 'mine', label: t('themes.mine') },
          ]}
        />
        <span className="muted small">{t('themes.count', { n: list.length })}</span>
      </div>
      {scheduled ? (
        <p className="notice">
          {t('themes.scheduleNote')} <a href="#/schedule">{t('nav.schedule')}</a>
        </p>
      ) : null}
      {filter === 'mine' && !list.length ? (
        <div className="empty">
          <p>{t('themes.mineEmpty')}</p>
          <button type="button" className="btn primary" onClick={() => go('editor')}>
            <Plus size={16} />
            {t('themes.create')}
          </button>
        </div>
      ) : (
        <ThemeGrid
          themes={list}
          activeId={settings.themeId}
          onPick={use}
          showOriginal={filter === 'all'}
          extra={(theme) => (
            <div className="card-actions">
              {theme.builtIn ? null : (
                <button
                  type="button"
                  className="icon-btn"
                  title={t('common.edit')}
                  aria-label={t('common.edit')}
                  onClick={() => go(`editor/${theme.id}`)}
                >
                  <Pencil size={15} />
                </button>
              )}
              <button
                type="button"
                className="icon-btn"
                title={t('common.duplicate')}
                aria-label={t('common.duplicate')}
                onClick={() => void duplicate(theme)}
              >
                <Copy size={15} />
              </button>
              {theme.builtIn ? null : (
                <>
                  <button
                    type="button"
                    className="icon-btn"
                    title={t('common.export')}
                    aria-label={t('common.export')}
                    onClick={() => downloadJson(makeThemeFile(theme), `${theme.name}.reelskin-theme.json`)}
                  >
                    <Download size={15} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn danger"
                    title={t('common.delete')}
                    aria-label={t('common.delete')}
                    onClick={() => void remove(theme)}
                  >
                    <Trash2 size={15} />
                  </button>
                </>
              )}
            </div>
          )}
        />
      )}
    </>
  );
}
