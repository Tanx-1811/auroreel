import { useEffect, useState } from 'react';

export type Route =
  | { page: 'themes' }
  | { page: 'editor'; id?: string }
  | { page: 'sites' }
  | { page: 'player' }
  | { page: 'schedule' }
  | { page: 'shortcuts' }
  | { page: 'backup' }
  | { page: 'about' }
  | { page: 'welcome' };

export function parseHash(hash: string): Route {
  const [page, id] = hash.replace(/^#\/?/, '').split('/');
  switch (page) {
    case 'editor':
      return id ? { page: 'editor', id: decodeURIComponent(id) } : { page: 'editor' };
    case 'sites':
    case 'player':
    case 'schedule':
    case 'shortcuts':
    case 'backup':
    case 'about':
    case 'welcome':
      return { page };
    default:
      return { page: 'themes' };
  }
}

export function go(path: string) {
  location.hash = `#/${path}`;
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
