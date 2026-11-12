/** Messages between the popup / service worker and the content script. */
import type { PlatformId } from '../core/platforms.ts';

export type PageAction =
  | 'cinema'
  | 'ambient'
  | 'filters'
  | 'screenshot'
  | 'loop'
  | 'pip'
  | 'speedUp'
  | 'speedDown'
  | 'speedReset'
  | 'rewind'
  | 'advance'
  | 'abStart'
  | 'abEnd'
  | 'abClear'
  | 'abCycle'
  | 'themeFromVideo'
  | 'toggleSkin';

/** Sleep timer: minutes from now, 'end' (pause when this video ends) or null (cancel). */
export type SleepRequest = number | 'end' | null;

export type ToPage =
  { type: 'rs:status' } | { type: 'rs:action'; action: PageAction } | { type: 'rs:sleep'; sleep: SleepRequest };

export interface PageStatus {
  platform: PlatformId;
  hasVideo: boolean;
  speed: number;
  cinema: boolean;
  loop: boolean;
  /** A–B loop points, seconds. */
  abA: number | null;
  abB: number | null;
  /** Sleep timer: time it fires (ms since epoch), or 'end' of the current video. */
  sleep: number | 'end' | null;
  /** Theme temporarily switched off in this tab (Alt+T). */
  skinPaused: boolean;
  /** Result of the last action, already translated (shown by the popup). */
  note?: string;
}

export async function sendToTab<T>(tabId: number, msg: ToPage): Promise<T | null> {
  try {
    return (await chrome.tabs.sendMessage(tabId, msg)) as T;
  } catch {
    return null;
  }
}
