/** The optional permission behind "player tools on every site". */
export const ANY_SITE_ORIGINS = ['https://*/*', 'http://*/*'];

export function hasAnySitePermission(): Promise<boolean> {
  return chrome.permissions.contains({ origins: ANY_SITE_ORIGINS });
}

/** Must run from a click. The service worker turns the setting on when the permission arrives. */
export function requestAnySitePermission(): Promise<boolean> {
  return chrome.permissions.request({ origins: ANY_SITE_ORIGINS });
}

export function removeAnySitePermission(): Promise<boolean> {
  return chrome.permissions.remove({ origins: ANY_SITE_ORIGINS });
}
