import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import hi from './locales/hi.json';
import bn from './locales/bn.json';
import te from './locales/te.json';
import mr from './locales/mr.json';
import ta from './locales/ta.json';
import gu from './locales/gu.json';
import ur from './locales/ur.json';
import kn from './locales/kn.json';
import or_ from './locales/or.json';
import ml from './locales/ml.json';
import pa from './locales/pa.json';
import as_ from './locales/as.json';

import { DEFAULT_LANGUAGE } from './languages';

// Languages without a resource file yet (Sanskrit, Konkani, Maithili, Dogri,
// Bodo, Kashmiri, Manipuri, Santali, Sindhi) are intentionally omitted here —
// i18next's fallbackLng shows English for them until a native-reviewed
// translation is added.
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
    bn: { translation: bn },
    te: { translation: te },
    mr: { translation: mr },
    ta: { translation: ta },
    gu: { translation: gu },
    ur: { translation: ur },
    kn: { translation: kn },
    or: { translation: or_ },
    ml: { translation: ml },
    pa: { translation: pa },
    as: { translation: as_ },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

export default i18n;
