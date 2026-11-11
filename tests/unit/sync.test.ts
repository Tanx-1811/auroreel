import { describe, expect, it } from 'vitest';
import { defaultSettings } from '../../src/core/settings';
import {
  applySynced,
  mergeSyncedThemes,
  planThemePush,
  pruneTombstones,
  SYNC_THEME_PREFIX,
  syncableThemes,
  toSynced,
} from '../../src/core/sync';
import { BUILT_IN_THEMES, type Theme } from '../../src/core/themes';

const theme = (id: string, extra: Partial<Theme> = {}): Theme => ({
  ...BUILT_IN_THEMES[0]!,
  builtIn: undefined,
  nameVi: undefined,
  id,
  name: id,
  ...extra,
});
const picture = theme('pic', {
  backdrop: { kind: 'image', image: 'data:image/webp;base64,AAAA', blur: 10, veil: 50, position: 'center' },
});

describe('settings sync', () => {
  it('leaves per-device fields out and keeps them on arrival', () => {
    const here = { ...defaultSettings(), anySite: true, sync: true, onboarded: true };
    const synced = toSynced({ ...here, themeId: 'ember' }, 'device-a', 1);
    expect(synced.settings).not.toHaveProperty('anySite');
    expect(synced.settings).not.toHaveProperty('sync');
    const other = { ...defaultSettings(), anySite: false, sync: true, onboarded: false };
    const applied = applySynced(other, synced);
    expect(applied.themeId).toBe('ember');
    expect(applied.anySite).toBe(false);
    expect(applied.onboarded).toBe(false);
    expect(applied.sync).toBe(true);
    expect(applySynced(other, null)).toBe(other);
  });
});

describe('theme sync', () => {
  it('syncs only themes that fit', () => {
    expect(syncableThemes([theme('a'), picture]).map((t) => t.id)).toEqual(['a']);
  });

  it('pushes new and changed themes, removes deleted ones with a tombstone', () => {
    const a = theme('a');
    const remote = {
      [`${SYNC_THEME_PREFIX}a`]: JSON.stringify(a),
      [`${SYNC_THEME_PREFIX}gone`]: JSON.stringify(theme('gone')),
      [`${SYNC_THEME_PREFIX}pic`]: '{}',
    };
    const plan = planThemePush([a, theme('b'), picture], remote, {}, 1000);
    expect(Object.keys(plan.set)).toEqual([`${SYNC_THEME_PREFIX}b`]);
    expect(plan.remove.sort()).toEqual([`${SYNC_THEME_PREFIX}gone`, `${SYNC_THEME_PREFIX}pic`]);
    // "pic" is still here (just too big): no tombstone for it.
    expect(plan.deleted).toEqual({ gone: 1000 });
  });

  it('merges arriving themes and honours deletions, keeping picture themes', () => {
    const local = [theme('a', { name: 'old' }), theme('deleted'), picture];
    const merged = mergeSyncedThemes(local, [theme('a', { name: 'new' }), theme('c'), { broken: true }], {
      deleted: 5,
    });
    expect(merged.map((t) => `${t.id}:${t.name}`)).toEqual(['a:new', 'c:c', 'pic:pic']);
  });

  it('forgets old tombstones', () => {
    const day = 86_400_000;
    expect(pruneTombstones({ old: 0, recent: 200 * day }, 250 * day)).toEqual({ recent: 200 * day });
  });
});
