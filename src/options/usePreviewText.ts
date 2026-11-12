import type { LargePreviewText } from '../ui/ThemePreview.tsx';
import { useT } from '../ui/i18n.tsx';

/** Words shown in the made-up watch page of the large theme preview. */
export function usePreviewText(): LargePreviewText {
  const t = useT();
  return {
    search: t('preview.search'),
    title: t('preview.title'),
    channel: t('preview.channel'),
    meta: t('preview.meta'),
    subscribe: t('preview.subscribe'),
    share: t('preview.share'),
    chips: [t('preview.chip1'), t('preview.chip2'), t('preview.chip3'), t('preview.chip4')],
    description: t('preview.description'),
    link: t('preview.link'),
    related: [
      { title: t('preview.rel1'), meta: t('preview.relMeta1') },
      { title: t('preview.rel2'), meta: t('preview.relMeta2') },
      { title: t('preview.rel3'), meta: t('preview.relMeta3') },
      { title: t('preview.rel4'), meta: t('preview.relMeta4') },
    ],
  };
}
