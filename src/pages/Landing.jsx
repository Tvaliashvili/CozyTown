import { Link } from '../router.jsx'
import { useI18n } from '../i18n/i18n.jsx'
import LanguageToggle from '../ui/LanguageToggle.jsx'
import { ChatIcon, DownloadIcon, GiftIcon, HouseIcon, KeyIcon, LockIcon, Logo, PICTURES } from '../ui/icons.jsx'
import './pages.css'

const STEPS = [
  { id: 1, picture: PICTURES.chooseHouse },
  { id: 2, picture: PICTURES.key },
  { id: 3, picture: PICTURES.decorate },
]
const OCCASIONS = [
  { id: 'valentine', picture: PICTURES.heart },
  { id: 'mother', picture: PICTURES.flower },
  { id: 'baby', picture: PICTURES.star },
  { id: 'grandparents', picture: PICTURES.home },
  { id: 'pet', picture: PICTURES.paw },
  { id: 'memory', picture: PICTURES.candle },
]
// Tilted a little each, like real frames hung by hand.
const INSIDE = [
  { id: 'photos', tilt: -2 },
  { id: 'letters', tilt: 1.5 },
  { id: 'capsule', tilt: -1 },
  { id: 'lanterns', tilt: 2 },
]
const PROMISES = [
  { id: 'private', icon: LockIcon },
  { id: 'outside', icon: HouseIcon },
  { id: 'export', icon: DownloadIcon },
]
// Test prices from the pricing hypothesis in CLAUDE.md - not final.
const PRICES = [
  { id: 'digital', price: 39 },
  { id: 'card', price: 49 },
  { id: 'keychain', price: 69, featured: true },
]
// TODO: put the real Instagram and Facebook pages here once they exist.
const INSTAGRAM_URL = 'https://instagram.com/'
const FACEBOOK_URL = 'https://facebook.com/'

export default function Landing() {
  const { t } = useI18n()

  return (
    <div className="landing">
      <header className="hero">
        <nav className="hero-nav" aria-label="Main">
          <a href="#top" className="brand">
            <Logo />
            <span>{t('appName')}</span>
          </a>
          <div className="hero-nav-links">
            <a href="#how">{t('nav.how')}</a>
            <a href="#prices">{t('nav.prices')}</a>
            <LanguageToggle className="pill-button outline" />
            <Link to="/signin" className="pill-button">{t('signIn')}</Link>
          </div>
        </nav>

        <div id="top" className="hero-text">
          <span className="hero-badge">
            <span className="glow-dot" aria-hidden="true" />
            {t('hero.badge')}
          </span>
          <h1>{t('tagline')}</h1>
          <p>{t('hero.text')}</p>
          <div className="button-row">
            <a href="#prices" className="big-button accent"><GiftIcon />{t('hero.give')}</a>
            <Link to="/signin" className="big-button">{t('hero.gotGift')}</Link>
          </div>
          <Link to="/town" className="hero-walk">{t('hero.walk')} →</Link>
        </div>

        <img className="hero-street" src="/art/hero-street.svg" alt="" />
      </header>

      <section id="how" className="section steps-section">
        <ol className="steps">
          {STEPS.map(({ id, picture }) => (
            <li key={id} className="card step">
              {picture}
              <span className="step-number">{t('how.step')} {id}</span>
              <h3>{t(`how.${id}.title`)}</h3>
              <p>{t(`how.${id}.text`)}</p>
            </li>
          ))}
        </ol>

        <div className="centered">
          <h2>{t('for.title')}</h2>
          <p className="lead">{t('for.text')}</p>
          <ul className="occasions">
            {OCCASIONS.map(({ id, picture }) => (
              <li key={id} className={`occasion occasion-${id}`}>
                {picture}
                {t(`for.${id}`)}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="inside-section">
        <img className="string-lights" src="/art/string-lights.svg" alt="" />
        <div className="section">
          <h2 className="centered">{t('inside.title')}</h2>
          <p className="lead centered">{t('inside.text')}</p>
          <div className="frames">
            {INSIDE.map(({ id, tilt }) => (
              <div key={id} className="frame" style={{ transform: `rotate(${tilt}deg)` }}>
                {PICTURES[id]}
                <h3>{t(`inside.${id}.title`)}</h3>
                <p>{t(`inside.${id}.text`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="promise-section">
        <div className="section promise">
          <img src="/art/promise-lantern.svg" alt="" width="200" height="240" />
          <div className="promise-text">
            <h2>{t('promise.title')}</h2>
            <p>{t('promise.text')}</p>
            <ul>
              {PROMISES.map(({ id, icon: Icon }) => (
                <li key={id}>
                  <Icon />
                  <span>
                    <strong>{t(`promise.${id}.title`)}</strong> {t(`promise.${id}.text`)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="prices" className="section">
        <h2 className="centered">{t('prices.title')}</h2>
        <p className="lead centered">{t('prices.text')}</p>
        <div className="tags">
          {PRICES.map(({ id, price, featured }) => (
            <div key={id} className={featured ? 'tag featured' : 'tag'}>
              <img className="tag-string" src="/art/tag-string.svg" alt="" />
              <div className="tag-card">
                <span className="tag-hole" aria-hidden="true" />
                {featured && <span className="tag-ribbon">{t('price.mostLoved')}</span>}
                <h3>{t(`price.${id}.title`)}</h3>
                <p className="tag-price">{price} ₾</p>
                <p className="tag-text">{t(`price.${id}.text`)}</p>
                <a href="#order" className={featured ? 'big-button accent' : 'big-button soft'}>{t('price.order')}</a>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="order" className="order-section">
        <div className="section narrow centered">
          <h2>{t('order.title')}</h2>
          <p className="lead">{t('order.text')}</p>
          <div className="button-row">
            <a href={INSTAGRAM_URL} className="big-button accent"><ChatIcon />{t('order.instagram')}</a>
            <a href={FACEBOOK_URL} className="big-button white"><ChatIcon />{t('order.facebook')}</a>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="card gift-card">
          <div>
            <h2>{t('gift.title')}</h2>
            <p>{t('gift.text')}</p>
          </div>
          <Link to="/signin" className="big-button dark"><KeyIcon />{t('gift.button')}</Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="section">
          <span>© 2027 Cozy Town · მყუდრო ქალაქი · Tbilisi</span>
          <span className="landing-footer-links">
            <Link to="/terms">{t('legal.terms')}</Link>
            {' · '}
            <Link to="/privacy">{t('legal.privacy')}</Link>
          </span>
        </div>
      </footer>
    </div>
  )
}
