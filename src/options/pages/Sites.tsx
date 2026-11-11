import { ChevronDown, Globe } from 'lucide-react';
import { useEffect, useState } from 'react';
import { GENERIC, PLATFORMS, type Platform } from '../../core/platforms.ts';
import { patchSite } from '../../core/settings.ts';
import { allThemes, themeName } from '../../core/themes.ts';
import { hasAnySitePermission, removeAnySitePermission, requestAnySitePermission } from '../../shared/anySite.ts';
import type { MessageKey } from '../../shared/i18n.ts';
import { Field, Select, Switch } from '../../ui/controls.tsx';
import { useLang, useT } from '../../ui/i18n.tsx';
import { LayoutPanel } from '../../ui/panels.tsx';
import { useToast } from '../../ui/toast.tsx';
import { PageHead } from '../PageHead.tsx';
import type { PageProps } from '../types.ts';

export function SitesPage(props: PageProps) {
  const t = useT();
  return (
    <>
      <PageHead title={t('sites.title')} subtitle={t('sites.subtitle')} />
      <div className="site-list">
        {PLATFORMS.map((p) => (
          <SiteRow key={p.id} platform={p} {...props} />
        ))}
        <AnySiteCard {...props} />
      </div>
    </>
  );
}

function SiteRow({ platform, settings, themes, update }: PageProps & { platform: Platform }) {
  const t = useT();
  const lang = useLang();
  const site = settings.sites[platform.id];
  const [open, setOpen] = useState(platform.id === 'youtube');
  const tierKey = `tier.${platform.tier}` as MessageKey;
  return (
    <section className={`card site ${site.enabled ? '' : 'off'}`}>
      <div className="site-head">
        <span className="site-logo" style={{ background: platform.brand }}>
          {platform.name.slice(0, 1)}
        </span>
        <div className="grow">
          <h3>{platform.name}</h3>
          <span className="muted small">{platform.hosts[0]}</span>
        </div>
        <span className={`badge ${platform.tier === 'full' ? 'acc' : ''}`} title={t(`${tierKey}Hint` as MessageKey)}>
          {t(tierKey)}
        </span>
        <Switch
          checked={site.enabled}
          label={t('sites.enable', { site: platform.name })}
          onChange={(v) => update((s) => patchSite(s, platform.id, { enabled: v }))}
        />
        <button
          type="button"
          className="icon-btn"
          aria-expanded={open}
          aria-label={t('sites.details', { site: platform.name })}
          onClick={() => setOpen(!open)}
        >
          <ChevronDown
            size={18}
            style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform .2s' }}
          />
        </button>
      </div>
      {open ? (
        <div className="site-body">
          <Field label={t('sites.theme')} hint={t('sites.themeHint')}>
            <Select
              value={site.themeId ?? ''}
              label={t('sites.theme')}
              onChange={(v) => update((s) => patchSite(s, platform.id, { themeId: v || null }))}
              options={[
                { value: '', label: t('sites.followGlobal') },
                { value: 'none', label: t('themes.original') },
                ...allThemes(themes).map((th) => ({ value: th.id, label: themeName(th, lang) })),
              ]}
            />
          </Field>
          <Field label={t('sites.player')} hint={t('sites.playerHint')}>
            <Switch
              checked={site.player}
              label={t('sites.player')}
              onChange={(v) => update((s) => patchSite(s, platform.id, { player: v }))}
            />
          </Field>
          {platform.layout.length ? (
            <div className="site-layout">
              <LayoutPanel platform={platform} settings={settings} update={update} />
            </div>
          ) : (
            <p className="muted small">{t(`${tierKey}Hint` as MessageKey)}</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function AnySiteCard({ settings, update }: PageProps) {
  const t = useT();
  const toast = useToast();
  const [granted, setGranted] = useState(false);
  useEffect(() => {
    void hasAnySitePermission().then(setGranted);
    const on = () => void hasAnySitePermission().then(setGranted);
    chrome.permissions.onAdded.addListener(on);
    chrome.permissions.onRemoved.addListener(on);
    return () => {
      chrome.permissions.onAdded.removeListener(on);
      chrome.permissions.onRemoved.removeListener(on);
    };
  }, []);
  const active = settings.anySite && granted;
  const site = settings.sites[GENERIC.id];
  return (
    <section className="card site">
      <div className="site-head">
        <span className="site-logo generic">
          <Globe size={18} />
        </span>
        <div className="grow">
          <h3>{t('sites.anyTitle')}</h3>
          <span className="muted small">{t('sites.anyHint')}</span>
        </div>
        {active ? (
          <button
            type="button"
            className="btn sm"
            onClick={() =>
              void removeAnySitePermission().then(() => {
                void update((s) => ({ ...s, anySite: false }));
                toast(t('sites.anyOff'));
              })
            }
          >
            {t('sites.anyStop')}
          </button>
        ) : (
          <button
            type="button"
            className="btn primary sm"
            onClick={() =>
              void requestAnySitePermission().then((ok) => {
                if (ok) {
                  void update((s) => ({ ...s, anySite: true }));
                  toast(t('sites.anyOn'));
                } else toast(t('sites.anyDenied'));
              })
            }
          >
            {t('sites.anyAllow')}
          </button>
        )}
      </div>
      {active ? (
        <div className="site-body">
          <Field label={t('sites.player')}>
            <Switch
              checked={site.player && site.enabled}
              label={t('sites.player')}
              onChange={(v) => update((s) => patchSite(s, GENERIC.id, { player: v, enabled: true }))}
            />
          </Field>
          <p className="muted small">{t('sites.anyReload')}</p>
        </div>
      ) : null}
    </section>
  );
}
