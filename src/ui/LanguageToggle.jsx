import { useI18n } from '../i18n/i18n.jsx'

// Switches between Georgian and English. The button shows the language you'd switch TO.
export default function LanguageToggle({ className = 'pill-button' }) {
  const { lang, setLang, t } = useI18n()

  return (
    <button type="button" className={className} onClick={() => setLang(lang === 'ka' ? 'en' : 'ka')}>
      {t('switchLanguage')}
    </button>
  )
}
