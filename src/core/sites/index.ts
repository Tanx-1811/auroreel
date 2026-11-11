import type { PlatformId } from '../platforms.ts';
import { generic, streamingAdapter } from './streaming.ts';
import { twitch } from './twitch.ts';
import type { SiteAdapter } from './types.ts';
import { youtube } from './youtube.ts';

export type { EngineConfig, LayoutStrings, SiteAdapter } from './types.ts';

const FULL: Partial<Record<PlatformId, SiteAdapter>> = { youtube, twitch, generic };

export function adapterFor(id: PlatformId): SiteAdapter {
  return FULL[id] ?? streamingAdapter(id);
}
