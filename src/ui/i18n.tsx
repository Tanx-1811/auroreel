import { createContext, useContext, type ReactNode } from 'react';
import { translate, type Lang, type MessageKey, type Vars } from '../shared/i18n.ts';

const LangContext = createContext<Lang>('en');

export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <LangContext.Provider value={lang}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext);
}

export function useT() {
  const lang = useContext(LangContext);
  return (key: MessageKey, vars?: Vars) => translate(lang, key, vars);
}
