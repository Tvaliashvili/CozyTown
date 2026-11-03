import { useI18n } from '../i18n/i18n.jsx'

export default function LanguageToggle() {
  const { lang, setLang, t } = useI18n()

  return (
    <button className="pill-button" onClick={() => setLang(lang === 'ka' ? 'en' : 'ka')}>
      {t('switchLanguage')}
    </button>
  )
}
