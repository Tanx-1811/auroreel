import { useT } from '../../ui/i18n.tsx';
import {
  AmbientPanel,
  CinemaPanel,
  FiltersPanel,
  SoundPanel,
  SpeedPanel,
  SubtitlesPanel,
  ToolbarPanel,
} from '../../ui/panels.tsx';
import { Card, PageHead } from '../PageHead.tsx';
import type { PageProps } from '../types.ts';

export function PlayerPage({ settings, update }: PageProps) {
  const t = useT();
  return (
    <>
      <PageHead title={t('player.title')} subtitle={t('player.subtitle')} />
      <div className="two-col">
        <div className="col">
          <Card title={t('player.ambient')}>
            <AmbientPanel settings={settings} update={update} />
          </Card>
          <Card title={t('player.cinema')}>
            <CinemaPanel settings={settings} update={update} />
          </Card>
          <Card title={t('player.speed')}>
            <SpeedPanel settings={settings} update={update} />
          </Card>
          <Card title={t('player.sound')}>
            <SoundPanel settings={settings} update={update} />
          </Card>
        </div>
        <div className="col">
          <Card title={t('player.filters')}>
            <FiltersPanel settings={settings} update={update} />
          </Card>
          <Card title={t('subs.title')}>
            <SubtitlesPanel settings={settings} update={update} />
          </Card>
          <Card title={t('player.toolbarTitle')}>
            <ToolbarPanel settings={settings} update={update} />
          </Card>
        </div>
      </div>
    </>
  );
}
