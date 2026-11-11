/**
 * The two <style> elements Reelskin adds to a page: the engine's recoloured
 * custom properties first, then the static stylesheet (tokens, backdrop,
 * site rules), so the static rules win where both set a property.
 * Elements inserted from a content script are not subject to the page's CSP.
 */
export class Styles {
  private engine = this.make('reelskin-engine');
  private main = this.make('reelskin-main');

  private make(id: string): HTMLStyleElement {
    const el = document.createElement('style');
    el.id = id;
    el.dataset.reelskin = '';
    return el;
  }

  /** Keeps both elements attached, last in <head> (or <html> before <head> exists). */
  private mount() {
    const parent = document.head ?? document.documentElement;
    if (!parent) return;
    for (const el of [this.engine, this.main]) {
      if (el.parentNode !== parent || (el === this.main && parent.lastElementChild !== el)) parent.appendChild(el);
    }
    if (this.engine.nextElementSibling !== this.main) parent.insertBefore(this.engine, this.main);
  }

  constructor() {
    this.mount();
    const remount = () => this.mount();
    if (!document.head) {
      const mo = new MutationObserver(() => {
        if (document.head) {
          mo.disconnect();
          remount();
        }
      });
      mo.observe(document.documentElement, { childList: true });
    }
    document.addEventListener('DOMContentLoaded', remount, { once: true });
    // Sites that rebuild <head> (rare) drop our elements; put them back.
    new MutationObserver(() => {
      if (!this.main.isConnected || !this.engine.isConnected) remount();
    }).observe(document.documentElement, { childList: true, subtree: false });
  }

  setMain(css: string) {
    if (this.main.textContent !== css) this.main.textContent = css;
    this.mount();
  }

  setEngine(css: string) {
    if (this.engine.textContent !== css) this.engine.textContent = css;
  }

  clear() {
    this.setMain('');
    this.setEngine('');
  }

  /** Runs `fn` with Reelskin's styles switched off (to read the site's own values). */
  withoutOurs<T>(fn: () => T): T {
    const sheets = [this.engine.sheet, this.main.sheet];
    for (const s of sheets) if (s) s.disabled = true;
    try {
      return fn();
    } finally {
      for (const s of sheets) if (s) s.disabled = false;
    }
  }
}
