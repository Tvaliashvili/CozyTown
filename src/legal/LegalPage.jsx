import { useI18n } from '../i18n/i18n.jsx'
import { formatDay } from '../lib/formatDate.js'
import { Link } from '../router.jsx'
import { BackIcon } from '../ui/icons.jsx'
import LanguageToggle from '../ui/LanguageToggle.jsx'
import { company } from './company.js'
import { privacyText } from './privacy.js'
import { termsText } from './terms.js'
import '../pages/pages.css'

// /terms and /privacy: plain reading pages. The texts live in terms.js and privacy.js,
// the business details in company.js.
export default function LegalPage({ which }) {
  const { t, lang } = useI18n()
  const text = which === 'privacy' ? privacyText(lang, company) : termsText(lang, company)
  const other = which === 'privacy' ? '/terms' : '/privacy'

  return (
    <div className="legal">
      <header className="legal-top">
        <div className="legal-nav">
          <Link to="/" className="pill-button glass"><BackIcon />{t('signin.back')}</Link>
          <LanguageToggle className="pill-button glass" />
        </div>
        <h1>{text.title}</h1>
      </header>

      <main className="legal-body">
        {company.isDraft && <p className="legal-draft" role="note">{t('legal.draft')}</p>}
        <p className="legal-updated">{t('legal.updated').replace('{date}', formatDay(company.updated, lang))}</p>
        <p>{text.intro}</p>
        {text.sections.map((section) => (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>
        ))}
        <p className="legal-other">
          <Link to={other}>{which === 'privacy' ? t('legal.terms') : t('legal.privacy')}</Link>
        </p>
      </main>
    </div>
  )
}
