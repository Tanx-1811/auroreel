import { Bug, Code2, ShieldCheck } from 'lucide-react';
import { Field, Segmented } from '../../ui/controls.tsx';
import { useT } from '../../ui/i18n.tsx';
import { LogoMark } from '../../ui/Logo.tsx';
import { Card, PageHead } from '../PageHead.tsx';
import type { PageProps } from '../types.ts';

export function AboutPage({ settings, update }: PageProps) {
  const t = useT();
  const version = chrome.runtime.getManifest().version;
  return (
    <>
      <PageHead title={t('about.title')} />
      <div className="about-hero">
        <LogoMark size={64} />
        <div>
          <h2 className="display">Auroreel</h2>
          <p className="muted">{t('app.tagline')}</p>
          <span className="badge">{t('about.version', { v: version })}</span>
        </div>
      </div>
      <div className="stack-16">
        <Card>
          <Field label={t('about.language')}>
            <Segmented
              value={settings.language}
              label={t('about.language')}
              onChange={(language) => update((s) => ({ ...s, language }))}
              options={[
                { value: 'auto', label: t('about.langAuto') },
                { value: 'vi', label: 'Tiếng Việt' },
                { value: 'en', label: 'English' },
              ]}
            />
          </Field>
        </Card>
        <Card title={t('about.privacyTitle')}>
          <p className="muted">{t('about.privacy')}</p>
        </Card>
        <Card title={t('about.howTitle')}>
          <ul className="muted how">
            <li>{t('about.how1')}</li>
            <li>{t('about.how2')}</li>
            <li>{t('about.how3')}</li>
            <li>{t('about.how4')}</li>
          </ul>
        </Card>
        <div className="about-links">
          <a className="btn sm" href="https://github.com/Tanx-1811/auroreel" target="_blank" rel="noreferrer">
            <Code2 size={14} />
            {t('about.source')}
          </a>
          <a
            className="btn sm"
            href="https://github.com/Tanx-1811/auroreel/issues/new/choose"
            target="_blank"
            rel="noreferrer"
          >
            <Bug size={14} />
            {t('about.report')}
          </a>
          <a
            className="btn sm"
            href="https://github.com/Tanx-1811/auroreel/blob/main/docs/PRIVACY.md"
            target="_blank"
            rel="noreferrer"
          >
            <ShieldCheck size={14} />
            {t('about.policy')}
          </a>
        </div>
        <p className="faint small">{t('about.disclaimer')}</p>
      </div>
    </>
  );
}
