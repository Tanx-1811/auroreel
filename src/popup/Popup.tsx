import {
  Camera,
  Captions,
  ExternalLink,
  Search,
  Shapes,
  Timer,
  Volume2,
  Keyboard,
  LayoutGrid,
  MoonStar,
  Palette,
  Plus,
  RefreshCw,
  Repeat,
  Repeat1,
  Sparkles,
  SlidersHorizontal,
  Wand2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { GENERIC, isWebUrl, platformForUrl, type Platform } from '../core/platforms.ts';
import { activeThemeId, isDaytime } from '../core/schedule.ts';
import { patchSite, type Settings } from '../core/settings.ts';
import { allThemes, findTheme, themeName, type Theme } from '../core/themes.ts';
import { hasAnySitePermission, requestAnySitePermission } from '../shared/anySite.ts';
import { resolveLang, type MessageKey } from '../shared/i18n.ts';
import { sendToTab, type PageAction, type PageStatus, type SleepRequest } from '../shared/messages.ts';
import { Segmented, Switch } from '../ui/controls.tsx';
import { LangProvider, useLang, useT } from '../ui/i18n.tsx';
import { LogoMark } from '../ui/Logo.tsx';
import {
  AmbientPanel,
  CinemaPanel,
  FiltersPanel,
  LayoutPanel,
  SoundPanel,
  SpeedPanel,
  SubtitlesPanel,
} from '../ui/panels.tsx';
import { useStore } from '../ui/store.ts';
import { filterThemes, ThemeGrid, toggleFavorite, type ThemeFilter } from '../ui/ThemeGrid.tsx';
import { MiniPreview } from '../ui/ThemePreview.tsx';
import { ProgressQuick } from '../ui/ProgressQuick.tsx';
import { adapterFor } from '../core/sites/index.ts';

type Tab = 'themes' | 'player' | 'layout';
type Update = (fn: (s: Settings) => Settings) => Promise<unknown>;

interface TabInfo {
  id: number | null;
  url: string | undefined;
  platform: Platform | null;
}

const TAB_KEY = 'rs:popup-tab';
const readTab = (): Tab => {
  try {
    const v = localStorage.getItem(TAB_KEY);
    return v === 'player' || v === 'layout' ? v : 'themes';
  } catch {
    return 'themes';
  }
};

function openStudio(hash = '') {
  void chrome.tabs.create({ url: chrome.runtime.getURL(`options/options.html${hash}`) });
  window.close();
}

export function Popup() {
  const { state, update } = useStore();
  useEffect(() => {
    if (state) document.documentElement.dataset.ready = '';
  }, [state]);
  const appearance = state?.settings.appearance ?? 'auto';
  useEffect(() => {
    document.documentElement.dataset.ui = appearance;
  }, [appearance]);
  if (!state) return <div className="popup loading" />;
  const lang = resolveLang(state.settings.language);
  return (
    <LangProvider lang={lang}>
      <PopupBody settings={state.settings} themes={state.themes} update={update} />
    </LangProvider>
  );
}

function PopupBody({ settings, themes, update }: { settings: Settings; themes: Theme[]; update: Update }) {
  const t = useT();
  const lang = useLang();
  const [tab, setTab] = useState<Tab>(readTab);
  const [info, setInfo] = useState<TabInfo>({ id: null, url: undefined, platform: null });
  const [status, setStatus] = useState<PageStatus | null | 'pending'>('pending');
  const [anySiteGranted, setAnySiteGranted] = useState(false);

  useEffect(() => {
    void (async () => {
      const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
      const url = active?.url;
      const platform = platformForUrl(url) ?? (isWebUrl(url) ? GENERIC : null);
      setInfo({ id: active?.id ?? null, url, platform });
      setAnySiteGranted(await hasAnySitePermission());
      setStatus(active?.id != null && platform ? await sendToTab<PageStatus>(active.id, { type: 'rs:status' }) : null);
    })();
  }, []);

  const chooseTab = (v: Tab) => {
    setTab(v);
    try {
      localStorage.setItem(TAB_KEY, v);
    } catch {
      // Private window: the choice just isn't remembered.
    }
  };

  const [note, setNote] = useState('');
  const [now, setNow] = useState(0);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 20_000);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, []);
  const act = useCallback(
    async (action: PageAction) => {
      if (info.id == null) return;
      const next = await sendToTab<PageStatus>(info.id, { type: 'rs:action', action });
      if (next) {
        setStatus(next);
        setNote(next.note ?? '');
      }
    },
    [info.id],
  );
  const sleep = useCallback(
    async (req: SleepRequest) => {
      if (info.id == null) return;
      const next = await sendToTab<PageStatus>(info.id, { type: 'rs:sleep', sleep: req });
      if (next) setStatus(next);
    },
    [info.id],
  );

  const platform = info.platform;
  const site = platform ? settings.sites[platform.id] : null;
  const live = status !== 'pending' && status !== null;
  const themed = platform && platform.tier !== 'player';

  return (
    <div className="popup">
      <header className="pop-head">
        <LogoMark size={30} />
        <div className="pop-title">
          <strong>Auroreel</strong>
          <span className="muted small">{settings.enabled ? t('popup.on') : t('popup.off')}</span>
        </div>
        <Switch
          checked={settings.enabled}
          onChange={(v) => update((s) => ({ ...s, enabled: v }))}
          label={t('popup.master')}
        />
      </header>

      <SiteCard
        info={info}
        settings={settings}
        themes={themes}
        status={status}
        anySiteGranted={anySiteGranted}
        update={update}
        onReload={() => {
          if (info.id != null) void chrome.tabs.reload(info.id);
          window.close();
        }}
        onResume={() => void act('toggleSkin')}
      />

      <nav className="pop-tabs" role="tablist" aria-label={t('popup.sections')}>
        {(
          [
            ['themes', Palette, 'popup.tabThemes'],
            ['player', SlidersHorizontal, 'popup.tabPlayer'],
            ['layout', LayoutGrid, 'popup.tabLayout'],
          ] as const
        ).map(([id, Icon, key]) => (
          <button key={id} role="tab" type="button" aria-selected={tab === id} onClick={() => chooseTab(id)}>
            <Icon size={15} />
            {t(key)}
          </button>
        ))}
      </nav>

      <main className="pop-main" role="tabpanel">
        {tab === 'themes' ? (
          <ThemesTab
            settings={settings}
            themes={themes}
            platform={themed ? platform : null}
            update={update}
            lang={lang}
          />
        ) : null}
        {tab === 'player' ? (
          <div className="pop-section">
            {live && status.hasVideo ? (
              <>
                <div className="quick">
                  <button
                    type="button"
                    className="quick-btn"
                    aria-pressed={status.cinema}
                    onClick={() => void act('cinema')}
                  >
                    <MoonStar size={17} />
                    {t('popup.qCinema')}
                  </button>
                  <button type="button" className="quick-btn" onClick={() => void act('screenshot')}>
                    <Camera size={17} />
                    {t('popup.qCapture')}
                  </button>
                  <button
                    type="button"
                    className="quick-btn"
                    aria-pressed={status.loop}
                    onClick={() => void act('loop')}
                  >
                    <Repeat size={17} />
                    {t('popup.qLoop')}
                  </button>
                  <button
                    type="button"
                    className="quick-btn"
                    aria-pressed={status.abB !== null}
                    onClick={() => void act('abCycle')}
                  >
                    <Repeat1 size={17} />
                    {status.abA === null
                      ? t('popup.qAB')
                      : status.abB === null
                        ? t('popup.qABSetB')
                        : t('popup.qABClear')}
                  </button>
                  <button type="button" className="quick-btn" onClick={() => void act('themeFromVideo')}>
                    <Palette size={17} />
                    {t('popup.qVideoTheme')}
                  </button>
                  <button type="button" className="quick-btn" onClick={() => void act('speedReset')}>
                    <span className="speed-num">{status.speed}×</span>
                    {t('popup.qSpeed')}
                  </button>
                </div>
                {note ? <p className="pop-note">{note}</p> : null}
                <h4 className="group-title">
                  <Timer size={14} /> {t('popup.sleep')}
                </h4>
                <div className="chips sleep-chips">
                  {([null, 15, 30, 60, 'end'] as SleepRequest[]).map((v) => {
                    const on = v === null ? status.sleep === null : v === 'end' ? status.sleep === 'end' : false;
                    return (
                      <button
                        key={String(v)}
                        type="button"
                        className="chip"
                        aria-pressed={on}
                        onClick={() => void sleep(v)}
                      >
                        {v === null
                          ? t('popup.sleepNone')
                          : v === 'end'
                            ? t('popup.sleepEnd')
                            : t('popup.sleepMin', { n: v })}
                      </button>
                    );
                  })}
                </div>
                {typeof status.sleep === 'number' ? (
                  <p className="muted small">
                    {t('popup.sleepLeft', { n: Math.max(1, Math.round((status.sleep - now) / 60_000)) })}
                  </p>
                ) : status.sleep === 'end' ? (
                  <p className="muted small">{t('popup.sleepLeftEnd')}</p>
                ) : null}
              </>
            ) : null}
            <h4 className="group-title">
              <Sparkles size={14} /> {t('player.ambient')}
            </h4>
            <AmbientPanel settings={settings} update={update} compact />
            <h4 className="group-title">
              <MoonStar size={14} /> {t('player.cinema')}
            </h4>
            <CinemaPanel settings={settings} update={update} compact />
            <h4 className="group-title">
              <Wand2 size={14} /> {t('player.filters')}
            </h4>
            <FiltersPanel settings={settings} update={update} compact />
            <h4 className="group-title">{t('player.speed')}</h4>
            <SpeedPanel settings={settings} update={update} compact />
            <h4 className="group-title">
              <Volume2 size={14} /> {t('player.sound')}
            </h4>
            <SoundPanel settings={settings} update={update} />
            <h4 className="group-title">
              <Captions size={14} /> {t('subs.title')}
            </h4>
            <SubtitlesPanel settings={settings} update={update} compact />
          </div>
        ) : null}
        {tab === 'layout' ? (
          <div className="pop-section">
            {platform && platform.tier !== 'player' && site ? (
              <>
                {adapterFor(platform.id).progressBar ? (
                  <>
                    <h4 className="group-title">
                      <Shapes size={14} /> {t('decor.progress')}
                    </h4>
                    <ProgressQuick
                      settings={settings}
                      themes={themes}
                      platform={platform.id}
                      update={update}
                      onMore={() => openStudio('#/decor')}
                    />
                  </>
                ) : null}
                <LayoutPanel platform={platform} settings={settings} update={update} />
              </>
            ) : (
              <p className="muted small">{t('popup.layoutNoSite')}</p>
            )}
          </div>
        ) : null}
      </main>

      <footer className="pop-foot">
        <button type="button" className="btn primary sm" onClick={() => openStudio('#/themes')}>
          <ExternalLink size={14} />
          {t('popup.openStudio')}
        </button>
        <button type="button" className="btn ghost sm" onClick={() => openStudio('#/shortcuts')}>
          <Keyboard size={14} />
          {t('popup.shortcuts')}
        </button>
      </footer>
    </div>
  );
}

function SiteCard({
  info,
  settings,
  themes,
  status,
  anySiteGranted,
  update,
  onReload,
  onResume,
}: {
  info: TabInfo;
  settings: Settings;
  themes: Theme[];
  status: PageStatus | null | 'pending';
  anySiteGranted: boolean;
  update: Update;
  onReload: () => void;
  onResume: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const p = info.platform;
  if (status === 'pending') return <div className="site-card skeleton" />;
  if (!p) {
    return (
      <div className="site-card">
        <div className="site-row">
          <div>
            <strong>{t('popup.noSiteTitle')}</strong>
            <div className="muted small">{t('popup.noSiteHint')}</div>
          </div>
        </div>
        <div className="site-links">
          {[
            ['YouTube', 'https://www.youtube.com/'],
            ['Twitch', 'https://www.twitch.tv/'],
            ['Netflix', 'https://www.netflix.com/'],
          ].map(([name, url]) => (
            <button key={name} type="button" className="chip" onClick={() => void chrome.tabs.create({ url })}>
              {name}
            </button>
          ))}
        </div>
      </div>
    );
  }
  if (p.tier === 'player' && !(settings.anySite && anySiteGranted)) {
    return (
      <div className="site-card">
        <div className="site-row">
          <div>
            <strong>{t('popup.genericTitle')}</strong>
            <div className="muted small">{t('popup.genericHint')}</div>
          </div>
        </div>
        <button
          type="button"
          className="btn sm block"
          onClick={() =>
            void requestAnySitePermission().then((ok) => {
              if (ok) void update((s) => ({ ...s, anySite: true }));
            })
          }
        >
          <Plus size={14} />
          {t('popup.genericEnable')}
        </button>
      </div>
    );
  }
  const site = settings.sites[p.id];
  const tierKey = `tier.${p.tier}` as MessageKey;
  const current =
    p.tier === 'player'
      ? null
      : findTheme(
          activeThemeId(settings, p.id, new Date(), matchMedia('(prefers-color-scheme: dark)').matches),
          themes,
        );
  return (
    <div className="site-card">
      <div className="site-row">
        {current ? (
          <span className="ct-thumb" aria-hidden="true">
            <MiniPreview theme={current} />
          </span>
        ) : (
          <span className="dot" style={{ background: p.brand, width: 10, height: 10 }} />
        )}
        <div className="grow site-text">
          <span className="site-name">
            <span className="dot" style={{ background: p.brand }} />
            <strong>{p.tier === 'player' ? t('platform.generic') : p.name}</strong>
            <span className="badge">{t(tierKey)}</span>
          </span>
          {p.tier !== 'player' ? (
            <span className="muted small">{current ? themeName(current, lang) : t('themes.original')}</span>
          ) : null}
        </div>
        <Switch
          checked={site.enabled}
          disabled={!settings.enabled}
          onChange={(v) => update((s) => patchSite(s, p.id, { enabled: v }))}
          label={t('popup.siteToggle', { site: p.name })}
        />
      </div>
      {status === null && settings.enabled && site.enabled ? (
        <button type="button" className="btn sm block" onClick={onReload}>
          <RefreshCw size={14} />
          {t('popup.reload')}
        </button>
      ) : null}
      {status && status.skinPaused ? (
        <button type="button" className="btn sm block" onClick={onResume}>
          {t('popup.resume')}
        </button>
      ) : null}
    </div>
  );
}

function ThemesTab({
  settings,
  themes,
  platform,
  update,
  lang,
}: {
  settings: Settings;
  themes: Theme[];
  platform: Platform | null;
  update: Update;
  lang: 'en' | 'vi';
}) {
  const t = useT();
  const [filter, setFilter] = useState<ThemeFilter>('all');
  const [query, setQuery] = useState('');
  const siteTheme = platform ? settings.sites[platform.id].themeId : null;
  const [siteOnly, setSiteOnly] = useState(!!siteTheme);
  const sched = settings.schedule;
  const nightNow =
    sched.mode === 'system'
      ? matchMedia('(prefers-color-scheme: dark)').matches
      : sched.mode === 'time'
        ? !isDaytime(sched.dayStart, sched.nightStart, new Date())
        : false;
  const globalActive = sched.mode === 'off' ? settings.themeId : nightNow ? sched.darkThemeId : sched.lightThemeId;
  const activeId = siteOnly && platform ? (siteTheme ?? globalActive) : globalActive;
  const list = useMemo(
    () => filterThemes(allThemes(themes), filter, settings.favorites, query),
    [themes, filter, settings.favorites, query],
  );
  const activeTheme = findTheme(activeId, themes);

  const pick = (id: string) => {
    if (siteOnly && platform) {
      void update((s) => patchSite(s, platform.id, { themeId: id }));
    } else if (sched.mode !== 'off') {
      void update((s) => ({
        ...s,
        schedule: nightNow ? { ...s.schedule, darkThemeId: id } : { ...s.schedule, lightThemeId: id },
      }));
    } else void update((s) => ({ ...s, themeId: id }));
  };

  return (
    <div className="pop-section">
      <div className="themes-head">
        <div className="muted small">
          {t('popup.current')}{' '}
          <strong className="current-name">{activeTheme ? themeName(activeTheme, lang) : t('themes.original')}</strong>
        </div>
        <Segmented
          value={filter}
          label={t('themes.filter')}
          onChange={setFilter}
          options={[
            { value: 'all', label: t('themes.all') },
            { value: 'fav', label: '♥' },
            { value: 'dark', label: t('themes.dark') },
            { value: 'light', label: t('themes.light') },
            { value: 'mine', label: t('themes.mine') },
          ]}
        />
        <label className="search">
          <Search size={14} />
          <input
            type="search"
            value={query}
            placeholder={t('themes.search')}
            aria-label={t('themes.search')}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      {platform ? (
        <label className="site-only">
          <Switch
            checked={siteOnly}
            label={t('popup.siteOnly', { site: platform.name })}
            onChange={(v) => {
              setSiteOnly(v);
              if (!v && siteTheme) void update((s) => patchSite(s, platform.id, { themeId: null }));
            }}
          />
          <span>{t('popup.siteOnly', { site: platform.name })}</span>
        </label>
      ) : null}
      {sched.mode !== 'off' && !(siteOnly && platform) ? (
        <p className="notice small">{nightNow ? t('popup.scheduleNight') : t('popup.scheduleDay')}</p>
      ) : null}
      {list.length ? (
        <ThemeGrid
          themes={list}
          activeId={activeId}
          onPick={pick}
          showOriginal={filter === 'all' && !query}
          favorites={settings.favorites}
          onFavorite={(id) => void update((s) => ({ ...s, favorites: toggleFavorite(s.favorites, id) }))}
        />
      ) : (
        <p className="muted small">
          {query ? t('themes.noResults') : filter === 'fav' ? t('themes.favEmpty') : t('themes.mineEmpty')}
        </p>
      )}
      <button type="button" className="btn sm block" style={{ marginTop: 14 }} onClick={() => openStudio('#/editor')}>
        <Plus size={14} />
        {t('themes.create')}
      </button>
    </div>
  );
}
