import i18n from '../i18n';

export type SupportedLanguage = 'Spain' | 'English' | 'German' | 'Portuguese';

const languageModules = import.meta.glob('../assets/language/*.{png,jpg,jpeg,webp,svg}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;

const languageIconTokens: Record<SupportedLanguage, string> = {
  Spain: 'espana',
  English: 'reino-unido',
  German: 'alemania',
  Portuguese: 'portugal',
};

const languageCodes: Record<SupportedLanguage, string> = {
  Spain: 'es',
  English: 'en',
  German: 'de',
  Portuguese: 'pt',
};

export interface LanguageOption {
  readonly value: SupportedLanguage;
  readonly code: string;
  readonly icon: string | null;
  readonly labelKey: string;
}

export const languageOptions: LanguageOption[] = (Object.keys(languageCodes) as SupportedLanguage[]).map((value) => {
  const token = languageIconTokens[value];
  const entry = Object.entries(languageModules).find(([path]) => path.toLowerCase().includes(token.toLowerCase()));
  const labelKeyByValue: Record<SupportedLanguage, string> = {
    Spain: 'common.language_spanish',
    English: 'common.language_english',
    German: 'common.language_german',
    Portuguese: 'common.language_portuguese',
  };

  return {
    value,
    code: languageCodes[value],
    icon: entry ? entry[1] : null,
    labelKey: labelKeyByValue[value],
  };
});

export const isSupportedLanguage = (value: string | null | undefined): value is SupportedLanguage =>
  value === 'Spain' || value === 'English' || value === 'German' || value === 'Portuguese';

export const normalizeSupportedLanguage = (value: string | null | undefined): SupportedLanguage =>
  isSupportedLanguage(value) ? value : 'Spain';

export const getStoredLanguagePreference = (): SupportedLanguage => {
  const stored = localStorage.getItem('yovi_user_language');
  return isSupportedLanguage(stored) ? stored : 'Spain';
};

export const getLanguageCode = (language: SupportedLanguage): string => languageCodes[language];

export const setAppLanguage = (language: SupportedLanguage) => {
  localStorage.setItem('yovi_user_language', language);
  document.documentElement.lang = languageCodes[language];
  void i18n.changeLanguage(languageCodes[language]);
};

