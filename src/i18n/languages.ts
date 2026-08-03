/**
 * Every language of India's Eighth Schedule, plus English. `hasTranslations`
 * is false for languages that don't have a resource file yet — i18next's
 * fallback shows English for those until a native-reviewed translation is
 * added, so they're still selectable rather than hidden.
 */
export type LanguageOption = {
  code: string;
  englishName: string;
  nativeName: string;
  hasTranslations: boolean;
};

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', englishName: 'English', nativeName: 'English', hasTranslations: true },
  { code: 'hi', englishName: 'Hindi', nativeName: 'हिन्दी', hasTranslations: true },
  { code: 'bn', englishName: 'Bengali', nativeName: 'বাংলা', hasTranslations: true },
  { code: 'te', englishName: 'Telugu', nativeName: 'తెలుగు', hasTranslations: true },
  { code: 'mr', englishName: 'Marathi', nativeName: 'मराठी', hasTranslations: true },
  { code: 'ta', englishName: 'Tamil', nativeName: 'தமிழ்', hasTranslations: true },
  { code: 'gu', englishName: 'Gujarati', nativeName: 'ગુજરાતી', hasTranslations: true },
  { code: 'ur', englishName: 'Urdu', nativeName: 'اردو', hasTranslations: true },
  { code: 'kn', englishName: 'Kannada', nativeName: 'ಕನ್ನಡ', hasTranslations: true },
  { code: 'or', englishName: 'Odia', nativeName: 'ଓଡ଼ିଆ', hasTranslations: true },
  { code: 'ml', englishName: 'Malayalam', nativeName: 'മലയാളം', hasTranslations: true },
  { code: 'pa', englishName: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', hasTranslations: true },
  { code: 'as', englishName: 'Assamese', nativeName: 'অসমীয়া', hasTranslations: true },
  // Pending native-speaker-reviewed translations — selectable now, shown in
  // English until a resource file is added.
  { code: 'sa', englishName: 'Sanskrit', nativeName: 'संस्कृतम्', hasTranslations: false },
  { code: 'kok', englishName: 'Konkani', nativeName: 'कोंकणी', hasTranslations: false },
  { code: 'mai', englishName: 'Maithili', nativeName: 'मैथिली', hasTranslations: false },
  { code: 'doi', englishName: 'Dogri', nativeName: 'डोगरी', hasTranslations: false },
  { code: 'brx', englishName: 'Bodo', nativeName: 'बड़ो', hasTranslations: false },
  { code: 'ks', englishName: 'Kashmiri', nativeName: 'کٲشُر', hasTranslations: false },
  { code: 'mni', englishName: 'Manipuri', nativeName: 'মৈতৈলোন্', hasTranslations: false },
  { code: 'sat', englishName: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', hasTranslations: false },
  { code: 'sd', englishName: 'Sindhi', nativeName: 'سنڌي', hasTranslations: false },
];

export const DEFAULT_LANGUAGE = 'en';
