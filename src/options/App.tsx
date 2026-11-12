import {
  Archive,
  CalendarClock,
  Globe,
  Info,
  Keyboard,
  LayoutDashboard,
  Monitor,
  Moon,
  Palette,
  PenTool,
  SlidersHorizontal,
  Sun,
} from 'lucide-react';
import { useEffect } from 'react';
import { resolveLang, type MessageKey } from '../shared/i18n.ts';
import { Switch } from '../ui/controls.tsx';
import { LangProvider, useT } from '../ui/i18n.tsx';
import { LogoMark } from '../ui/Logo.tsx';
import { useStore } from '../ui/store.ts';
import { ToastProvider } from '../ui/toast.tsx';
import { AboutPage } from './pages/About.tsx';
import { HomePage } from './pages/Home.tsx';
import { BackupPage } from './pages/Backup.tsx';
import { EditorPage } from './pages/Editor.tsx';
import { PlayerPage } from './pages/Player.tsx';
import { SchedulePage } from './pages/Schedule.tsx';
import { ShortcutsPage } from './pages/Shortcuts.tsx';
import { SitesPage } from './pages/Sites.tsx';
import { ThemesPage } from './pages/Themes.tsx';
import { WelcomePage } from './pages/Welcome.tsx';
import { useRoute, type Route } from './router.ts';
import type { PageProps } from './types.ts';

const NAV: { page: Route['page']; icon: typeof Palette; key: MessageKey }[] = [
  { page: 'home', icon: LayoutDashboard, key: 'nav.home' },
  { page: 'themes', icon: Palette, key: 'nav.themes' },
  { page: 'editor', icon: PenTool, key: 'nav.editor' },
  { page: 'sites', icon: Globe, key: 'nav.sites' },
  { page: 'player', icon: SlidersHorizontal, key: 'nav.player' },
  { page: 'schedule', icon: CalendarClock, key: 'nav.schedule' },
  { page: 'shortcuts', icon: Keyboard, key: 'nav.shortcuts' },
  { page: 'backup', icon: Archive, key: 'nav.backup' },
  { page: 'about', icon: Info, key: 'nav.about' },
];

export function App() {
  const store = useStore();
  const route = useRoute();
  const lang = store.state ? resolveLang(store.state.settings.language) : 'en';
  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);
  const appearance = store.state?.settings.appearance ?? 'auto';
  useEffect(() => {
    document.documentElement.dataset.ui = appearance;
  }, [appearance]);
  useEffect(() => {
    if (store.state) document.documentElement.dataset.ready = '';
  }, [store.state]);
  if (!store.state) return null;
  const props: PageProps = {
    settings: store.state.settings,
    themes: store.state.themes,
    update: store.update,
    saveTheme: store.saveTheme,
    removeTheme: store.removeTheme,
  };
  return (
    <LangProvider lang={lang}>
      <ToastProvider>
        {route.page === 'welcome' ? <WelcomePage {...props} /> : <Shell route={route} props={props} />}
      </ToastProvider>
    </LangProvider>
  );
}

function Shell({ route, props }: { route: Route; props: PageProps }) {
  const t = useT();
  useEffect(() => {
    document.title = `${t(NAV.find((n) => n.page === route.page)?.key ?? 'nav.themes')} · Auroreel`;
  }, [route.page, t]);
  return (
    <div className="studio">
      <aside className="side">
        <a className="brand" href="#/home">
          <LogoMark size={34} />
          <span>
            <strong>Auroreel</strong>
            <span className="muted small">Studio</span>
          </span>
        </a>
        <nav aria-label={t('nav.label')}>
          {NAV.map(({ page, icon: Icon, key }) => (
            <a key={page} href={`#/${page}`} aria-current={route.page === page ? 'page' : undefined}>
              <Icon size={17} />
              {t(key)}
            </a>
          ))}
        </nav>
        <div className="side-foot">
          <div className="appearance" role="radiogroup" aria-label={t('ui.appearance')}>
            {(
              [
                ['auto', Monitor, 'ui.auto'],
                ['dark', Moon, 'ui.dark'],
                ['light', Sun, 'ui.light'],
              ] as const
            ).map(([value, Icon, key]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={props.settings.appearance === value}
                aria-label={t(key)}
                title={t(key)}
                onClick={() => props.update((s) => ({ ...s, appearance: value }))}
              >
                <Icon size={15} />
              </button>
            ))}
          </div>
          <label className="master">
            <Switch
              checked={props.settings.enabled}
              label={t('popup.master')}
              onChange={(v) => props.update((s) => ({ ...s, enabled: v }))}
            />
            <span>{props.settings.enabled ? t('popup.on') : t('popup.off')}</span>
          </label>
        </div>
      </aside>
      <main className="content">
        {route.page === 'home' ? <HomePage {...props} /> : null}
        {route.page === 'themes' ? <ThemesPage {...props} /> : null}
        {route.page === 'editor' ? <EditorPage key={route.id ?? 'new'} id={route.id} {...props} /> : null}
        {route.page === 'sites' ? <SitesPage {...props} /> : null}
        {route.page === 'player' ? <PlayerPage {...props} /> : null}
        {route.page === 'schedule' ? <SchedulePage {...props} /> : null}
        {route.page === 'shortcuts' ? <ShortcutsPage {...props} /> : null}
        {route.page === 'backup' ? <BackupPage {...props} /> : null}
        {route.page === 'about' ? <AboutPage {...props} /> : null}
      </main>
    </div>
  );
}
