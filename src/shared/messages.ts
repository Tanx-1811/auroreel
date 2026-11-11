/** Messages between the popup / service worker and the content script. */
import type { PlatformId } from '../core/platforms.ts';

export type PageAction =
  'cinema' | 'ambient' | 'screenshot' | 'loop' | 'pip' | 'speedUp' | 'speedDown' | 'speedReset' | 'toggleSkin';

export type ToPage = { type: 'rs:status' } | { type: 'rs:action'; action: PageAction };

export interface PageStatus {
  platform: PlatformId;
  hasVideo: boolean;
  speed: number;
  cinema: boolean;
  loop: boolean;
  /** Theme temporarily switched off in this tab (Alt+T). */
  skinPaused: boolean;
}

export async function sendToTab<T>(tabId: number, msg: ToPage): Promise<T | null> {
  try {
    return (await chrome.tabs.sendMessage(tabId, msg)) as T;
  } catch {
    return null;
  }
}
