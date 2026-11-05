import { useEffect, useState } from 'react'
import { loadCardInfo } from '../data/houses.js'
import { useI18n } from '../i18n/i18n.jsx'
import { Link } from '../router.jsx'
import LanguageToggle from '../ui/LanguageToggle.jsx'
import { hideLoadingScreen } from '../ui/loadingScreen.js'
import { BackIcon } from '../ui/icons.jsx'
import { CARD_H, CARD_W, CardBack, CardFront } from './CardSides.jsx'
import './card.css'

// For the print shop, the PDF is the card plus this much extra background on each side.
const BLEED_MM = 3

// /h/<code>/card: the printable card for a house, for its keeper or an admin.
// The card's words follow the language picked at the top of the page.
//
// Two ways to print it:
//   shop - a PDF the exact size of the card (plus bleed), front on page 1, back on page 2.
//   home - one A4 sheet: back and front side by side. Cut it out and fold it in the middle,
//          so it needs no two-sided printing.
// The browser's own print window does the work ("Save as PDF" makes the file).
export default function CardPage({ code }) {
  const { t } = useI18n()
  // 'loading' | 'notAllowed' | 'failed' | 'ready'
  const [status, setStatus] = useState('loading')
  const [info, setInfo] = useState(null)
  const [mode, setMode] = useState('shop')

  function load() {
    setStatus('loading')
    loadCardInfo(code)
      .then((found) => {
        setInfo(found)
        setStatus(found ? 'ready' : 'notAllowed')
      })
      .catch(() => setStatus('failed'))
  }

  useEffect(load, [code])
  useEffect(hideLoadingScreen, [])

  let content
  if (status === 'loading') {
    content = <p role="status">{t('card.loading')}</p>
  } else if (status === 'failed') {
    content = (
      <div className="card-message" role="alert">
        <p>{t('house.failed.text')}</p>
        <button type="button" className="big-button accent" onClick={load}>
          {t('tryAgain')}
        </button>
      </div>
    )
  } else if (status === 'notAllowed') {
    content = (
      <div className="card-message">
        <h2>{t('card.notAllowed.title')}</h2>
        <p>{t('card.notAllowed.text')}</p>
        <Link to="/signin?login" className="big-button accent">
          {t('signin.logIn')}
        </Link>
      </div>
    )
  } else {
    content = (
      <>
        {info.giftCode && <p className="card-gift-note">{t('card.giftNote')}</p>}

        <figure className="card-preview">
          <CardFront />
          <figcaption>{t('card.frontSide')}</figcaption>
        </figure>
        <figure className="card-preview">
          <CardBack code={code} giftCode={info.giftCode} title={info.title} />
          <figcaption>{t('card.backSide')}</figcaption>
        </figure>

        <fieldset className="card-modes">
          <legend>{t('card.howTitle')}</legend>
          <ModeChoice value="shop" mode={mode} onChange={setMode} label={t('card.modeShop')} help={t('card.shopHelp')} />
          <ModeChoice value="home" mode={mode} onChange={setMode} label={t('card.modeHome')} help={t('card.homeHelp')} />
        </fieldset>

        <button type="button" className="big-button accent" onClick={() => window.print()}>
          {t('card.print')}
        </button>

        {/* Only this part is printed. It isn't shown on screen. */}
        <div className="card-print" aria-hidden="true">
          {mode === 'shop' ? (
            <>
              <div className="print-page">
                <CardFront bleed={BLEED_MM} />
              </div>
              <div className="print-page">
                <CardBack code={code} giftCode={info.giftCode} title={info.title} bleed={BLEED_MM} />
              </div>
            </>
          ) : (
            <div className="print-a4">
              <div className="fold-strip">
                <CardBack code={code} giftCode={info.giftCode} title={info.title} />
                <CardFront />
              </div>
              <p className="print-a4-help">{t('card.homeCutHelp')}</p>
            </div>
          )}
        </div>
      </>
    )
  }

  // The printed page size. @page can't be switched with a class, so it's written out here.
  const pageSize =
    mode === 'shop' ? `${CARD_W + 2 * BLEED_MM}mm ${CARD_H + 2 * BLEED_MM}mm` : 'A4'

  return (
    <div className="card-page">
      <style>{`@page { size: ${pageSize}; margin: 0; }`}</style>
      <header className="card-top">
        <Link to={`/h/${code}`} className="pill-button">
          <BackIcon />
          {t('card.backToHouse')}
        </Link>
        <LanguageToggle />
      </header>
      <h1>{t('card.title')}</h1>
      {content}
    </div>
  )
}

function ModeChoice({ value, mode, onChange, label, help }) {
  return (
    <label className={mode === value ? 'card-mode chosen' : 'card-mode'}>
      <input type="radio" name="print-mode" value={value} checked={mode === value} onChange={() => onChange(value)} />
      <span>
        <strong>{label}</strong>
        <span>{help}</span>
      </span>
    </label>
  )
}
