import { Download, RotateCcw, Upload } from 'lucide-react';
import { useRef } from 'react';
import { makeBackup, mergeThemes, parseImport } from '../../core/backup.ts';
import { defaultSettings } from '../../core/settings.ts';
import { saveSettings, saveThemes } from '../../shared/storage.ts';
import { useT } from '../../ui/i18n.tsx';
import { useToast } from '../../ui/toast.tsx';
import { downloadJson, readFileText } from '../files.ts';
import { Card, PageHead } from '../PageHead.tsx';
import type { PageProps } from '../types.ts';

export function BackupPage({ settings, themes }: PageProps) {
  const t = useT();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const doImport = async (file: File) => {
    const parsed = parseImport(await readFileText(file));
    if (parsed.type === 'backup') {
      if (!confirm(t('backup.importConfirm'))) return;
      await saveSettings({ ...parsed.settings, onboarded: true });
      await saveThemes(mergeThemes(themes, parsed.themes));
      toast(t('backup.importOk', { n: parsed.themes.length }));
    } else if (parsed.type === 'theme') {
      await saveThemes(mergeThemes(themes, [parsed.theme]));
      toast(t('themes.imported', { name: parsed.theme.name }));
    } else toast(t('backup.importBad'));
  };

  return (
    <>
      <PageHead title={t('backup.title')} subtitle={t('backup.subtitle')} />
      <div className="stack-16">
        <Card
          title={t('backup.export')}
          hint={t('backup.exportHint', { n: themes.length })}
          actions={
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                const date = new Date().toISOString().slice(0, 10);
                downloadJson(makeBackup(settings, themes), `reelskin-backup-${date}.json`);
              }}
            >
              <Download size={15} />
              {t('backup.exportBtn')}
            </button>
          }
        >
          {null}
        </Card>
        <Card
          title={t('backup.import')}
          hint={t('backup.importHint')}
          actions={
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              <Upload size={15} />
              {t('backup.importBtn')}
            </button>
          }
        >
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = '';
              if (f) void doImport(f);
            }}
          />
        </Card>
        <Card
          title={t('backup.reset')}
          hint={t('backup.resetHint')}
          actions={
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                if (!confirm(t('backup.resetConfirm'))) return;
                void (async () => {
                  await saveThemes([]);
                  await saveSettings({ ...defaultSettings(), onboarded: true });
                  toast(t('backup.resetDone'));
                })();
              }}
            >
              <RotateCcw size={15} />
              {t('backup.resetBtn')}
            </button>
          }
        >
          {null}
        </Card>
      </div>
    </>
  );
}
