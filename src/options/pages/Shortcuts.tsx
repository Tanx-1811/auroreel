import { ExternalLink, RotateCcw, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ACTION_IDS,
  conflicts,
  DEFAULT_SHORTCUTS,
  formatShortcut,
  shortcutFromEvent,
  type ActionId,
} from '../../core/shortcuts.ts';
import type { MessageKey } from '../../shared/i18n.ts';
import { Field, Switch } from '../../ui/controls.tsx';
import { useT } from '../../ui/i18n.tsx';
import { Card, PageHead } from '../PageHead.tsx';
import type { PageProps } from '../types.ts';

const IS_MAC = /Mac/.test(navigator.platform);

export function ShortcutsPage({ settings, update }: PageProps) {
  const t = useT();
  const [recording, setRecording] = useState<ActionId | null>(null);
  const [commands, setCommands] = useState<chrome.commands.Command[]>([]);
  const clash = conflicts(settings.shortcuts);

  useEffect(() => {
    void chrome.commands.getAll().then(setCommands);
  }, []);

  useEffect(() => {
    if (!recording) return;
    const onKey = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') return setRecording(null);
      if (e.key === 'Backspace' || e.key === 'Delete') {
        void update((s) => ({ ...s, shortcuts: { ...s.shortcuts, [recording]: null } }));
        return setRecording(null);
      }
      const sc = shortcutFromEvent(e);
      if (!sc) return; // a modifier on its own: keep listening
      void update((s) => ({ ...s, shortcuts: { ...s.shortcuts, [recording]: sc } }));
      setRecording(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [recording, update]);

  return (
    <>
      <PageHead
        title={t('shortcuts.title')}
        subtitle={t('shortcuts.subtitle')}
        actions={
          <button
            type="button"
            className="btn"
            onClick={() => void update((s) => ({ ...s, shortcuts: { ...DEFAULT_SHORTCUTS } }))}
          >
            <RotateCcw size={15} />
            {t('shortcuts.reset')}
          </button>
        }
      />
      <Card>
        <Field label={t('shortcuts.on')} hint={t('shortcuts.onHint')}>
          <Switch
            checked={settings.shortcutsOn}
            label={t('shortcuts.on')}
            onChange={(v) => update((s) => ({ ...s, shortcutsOn: v }))}
          />
        </Field>
        <div className={`keys ${settings.shortcutsOn ? '' : 'off'}`}>
          {ACTION_IDS.map((id) => {
            const value = settings.shortcuts[id];
            return (
              <div key={id} className="key-row">
                <span className="grow">{t(`action.${id}` as MessageKey)}</span>
                {clash.has(id) ? <span className="badge warn">{t('shortcuts.conflict')}</span> : null}
                <button
                  type="button"
                  className={`kbd-btn ${recording === id ? 'rec' : ''}`}
                  onClick={() => setRecording(recording === id ? null : id)}
                >
                  <span className="sr-only">
                    {t('shortcuts.change', { action: t(`action.${id}` as MessageKey) })}:{' '}
                  </span>
                  {recording === id ? t('shortcuts.press') : <kbd>{formatShortcut(value, IS_MAC)}</kbd>}
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={t('shortcuts.clear')}
                  title={t('shortcuts.clear')}
                  disabled={!value}
                  onClick={() => void update((s) => ({ ...s, shortcuts: { ...s.shortcuts, [id]: null } }))}
                >
                  <X size={15} />
                </button>
              </div>
            );
          })}
        </div>
        <p className="muted small">{t('shortcuts.recordHint')}</p>
      </Card>
      <div style={{ height: 16 }} />
      <Card
        title={t('shortcuts.global')}
        hint={t('shortcuts.globalHint')}
        actions={
          <button
            type="button"
            className="btn sm"
            onClick={() => void chrome.tabs.create({ url: 'chrome://extensions/shortcuts' })}
          >
            <ExternalLink size={14} />
            {t('shortcuts.openChrome')}
          </button>
        }
      >
        <div className="keys">
          {commands
            .filter((c) => c.name)
            .map((c) => (
              <div key={c.name} className="key-row">
                <span className="grow">{c.name === '_execute_action' ? t('shortcuts.openPopup') : c.description}</span>
                <kbd>{c.shortcut || t('shortcuts.notSet')}</kbd>
              </div>
            ))}
        </div>
      </Card>
    </>
  );
}
