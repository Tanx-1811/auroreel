import { Download, RotateCcw, Upload } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { makeBackup, mergeThemes, parseImport } from '../../core/backup.ts';
import { defaultSettings } from '../../core/settings.ts';
import { saveSettings, saveThemes, SYNC_STATUS_KEY } from '../../shared/storage.ts';
import { syncableThemes } from '../../core/sync.ts';
import { Switch } from '../../ui/controls.tsx';
import { useLang } from '../../ui/i18n.tsx';
import { useT } from '../../ui/i18n.tsx';
import { useToast } from '../../ui/toast.tsx';
import { downloadJson, readFileText } from '../files.ts';
import { Card, PageHead } from '../PageHead.tsx';
import type { PageProps } from '../types.ts';

export function BackupPage({ settings, themes, update }: PageProps) {
  const t = useT();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);

  const doImport = async (file: File) => {
    const parsed = parseImport(await readFileText(file));
    if (parsed.type === 'backup') {
      if (!confirm(t('backup.importConfirm'))) return;
      // Per-device switches stay as they are on this computer.
      await saveSettings({ ...parsed.settings, onboarded: true, sync: settings.sync, anySite: settings.anySite });
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
        <SyncCard settings={settings} themes={themes} update={update} />
        <Card
          title={t('backup.export')}
          hint={themes.length ? t('backup.exportHint', { n: themes.length }) : t('backup.exportHintNone')}
          actions={
            <button
              type="button"
              className="btn primary"
              onClick={() => {
                const date = new Date().toISOString().slice(0, 10);
                downloadJson(makeBackup(settings, themes), `auroreel-backup-${date}.json`);
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
          {null}
        </Card>
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

interface SyncStatus {
  at: number;
  ok: boolean;
  error?: string;
}

function SyncCard({ settings, themes, update }: Pick<PageProps, 'settings' | 'themes' | 'update'>) {
  const t = useT();
  const lang = useLang();
  const [status, setStatus] = useState<SyncStatus | null>(null);
  useEffect(() => {
    const read = () =>
      void chrome.storage.local
        .get(SYNC_STATUS_KEY)
        .then((got) => setStatus((got[SYNC_STATUS_KEY] as SyncStatus) ?? null));
    read();
    const on = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area === 'local' && changes[SYNC_STATUS_KEY]) read();
    };
    chrome.storage.onChanged.addListener(on);
    return () => chrome.storage.onChanged.removeListener(on);
  }, []);
  const skipped = themes.length - syncableThemes(themes).length;
  const when = status ? new Date(status.at).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US') : '';
  return (
    <Card
      title={t('backup.sync')}
      hint={t('backup.syncHint')}
      actions={
        <Switch
          checked={settings.sync}
          label={t('backup.syncSwitch')}
          onChange={(v) => update((s) => ({ ...s, sync: v }))}
        />
      }
    >
      {settings.sync && status ? (
        <p className={`small ${status.ok ? 'muted' : 'warn-text'}`} style={{ margin: '10px 0 0' }}>
          {status.ok ? t('backup.syncOk', { time: when }) : t('backup.syncError', { error: status.error ?? '' })}
        </p>
      ) : null}
      {settings.sync && skipped > 0 ? (
        <p className="muted small" style={{ margin: '6px 0 0' }}>
          {t('backup.syncSkipped', { n: skipped })}
        </p>
      ) : null}
    </Card>
  );
}
