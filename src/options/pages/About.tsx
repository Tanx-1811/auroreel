import { Lock, Sparkles } from 'lucide-react';
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
          <h2 className="display">Reelskin</h2>
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
        <Card
          title={
            <span className="with-icon">
              <Lock size={16} /> {t('about.privacyTitle')}
            </span>
          }
        >
          <p className="muted">{t('about.privacy')}</p>
        </Card>
        <Card
          title={
            <span className="with-icon">
              <Sparkles size={16} /> {t('about.howTitle')}
            </span>
          }
        >
          <ul className="muted how">
            <li>{t('about.how1')}</li>
            <li>{t('about.how2')}</li>
            <li>{t('about.how3')}</li>
            <li>{t('about.how4')}</li>
          </ul>
        </Card>
        <p className="faint small">{t('about.disclaimer')}</p>
      </div>
    </>
  );
}
