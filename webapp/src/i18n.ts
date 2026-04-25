import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import es from './locales/es/translation.json'
import en from './locales/en/translation.json'
import de from './locales/de/translation.json'
import pt from './locales/pt/translation.json'

const langMap: Record<string, string> = {
    'Spain': 'es', 'English': 'en', 'German': 'de', 'Portuguese': 'pt',
}
const storedLang = localStorage.getItem('yovi_user_language') || 'es'
i18n.use(initReactI18next).init({
    resources: {
        es: { translation: es },
        en: { translation: en },
        de: { translation: de },
        pt: { translation: pt },
    },
    lng: langMap[storedLang] ?? storedLang,
    fallbackLng: 'es',
    interpolation: { escapeValue: false },
    keySeparator: '.',
})

document.documentElement.lang = langMap[storedLang] ?? storedLang

export default i18n
