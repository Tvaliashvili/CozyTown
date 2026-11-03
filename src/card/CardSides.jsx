import { useId } from 'react'
import { useI18n } from '../i18n/i18n.jsx'
import { houseUrl, shortHouseUrl } from '../data/links.js'
import { Logo } from '../ui/icons.jsx'
import QrCode from '../ui/QrCode.jsx'

// The two sides of the printed card, sized in millimetres: a bank card is 85.6 × 54 mm.
// bleed: extra mm of background on every edge, which the print shop cuts off. It means a
// slightly crooked cut still leaves color right up to the edge instead of a thin white line.
// Words and the QR code stay at least SAFE mm inside the cut, so a crooked cut never touches them.
export const CARD_W = 85.6
export const CARD_H = 54
const SAFE = 4

function sideStyle(bleed) {
  return {
    width: `${CARD_W + 2 * bleed}mm`,
    height: `${CARD_H + 2 * bleed}mm`,
    padding: `${bleed + SAFE}mm`,
  }
}

// The picture side: the cozy house at dusk, the name, and one warm line.
export function CardFront({ bleed = 0 }) {
  const { t } = useI18n()
  const w = CARD_W + 2 * bleed
  const h = CARD_H + 2 * bleed
  // The page shows the card twice (on screen and for printing), and one copy is always hidden.
  // Each copy needs its own color ids, or the visible one could borrow from the hidden one and lose them.
  const id = useId()
  // The house picture (public/art/signin-house.svg, 390 × 400) sits bottom right, 50 mm tall.
  // Its lawn starts 88% of the way down, so the full-width lawn below is drawn to line up with it.
  const artH = 50
  const artW = artH * (390 / 400)
  const artX = w - bleed - artW + 2
  const artY = h - artH

  return (
    <div className="card-side card-front" style={sideStyle(bleed)}>
      <svg className="card-front-art" width={`${w}mm`} height={`${h}mm`} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
        <defs>
          <linearGradient id={`${id}sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2e2850" />
            <stop offset="0.5" stopColor="#6b4f8c" />
            <stop offset="0.85" stopColor="#c97a86" />
          </linearGradient>
          <linearGradient id={`${id}lawn`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8db472" />
            <stop offset="1" stopColor="#5a8449" />
          </linearGradient>
        </defs>
        <rect width={w} height={h} fill={`url(#${id}sky)`} />
        {/* Hills on the left that run into the hills of the picture */}
        <path
          d={`M0 ${h - 12} C${artX * 0.3} ${h - 16} ${artX * 0.6} ${h - 8} ${artX + 1} ${h - 8.8} V${h} H0 Z`}
          fill="#7d6f9c"
        />
        <rect y={h - 6} width={w} height={6} fill={`url(#${id}lawn)`} />
        <image href="/art/signin-house.svg" x={artX} y={artY} width={artW} height={artH} />
      </svg>

      <div className="card-front-words">
        <p className="card-brand">
          <Logo />
          {t('appName')}
        </p>
        <h2>{t('card.front.title')}</h2>
      </div>
    </div>
  )
}

// The QR side. giftCode set: nobody has opened the house yet, so it explains how to claim it.
// Otherwise it simply invites people in. title: the house's name, if it has one.
export function CardBack({ code, giftCode, title, bleed = 0 }) {
  const { t } = useI18n()

  return (
    <div className="card-side card-back" style={sideStyle(bleed)}>
      <div className="card-qr">
        <QrCode text={houseUrl(code)} className="card-qr-code" />
        <span className="card-url">{shortHouseUrl(code)}</span>
      </div>

      <div className="card-back-words">
        {giftCode ? (
          <>
            <h2>{t('card.gift.title')}</h2>
            <ol>
              <li>{t('card.gift.step1')}</li>
              <li>{t('card.gift.step2').replace('{button}', t('house.claimIt'))}</li>
              <li>{t('card.gift.step3')}</li>
            </ol>
            <p className="card-gift-code">{groupGiftCode(giftCode)}</p>
          </>
        ) : (
          <>
            <h2>{title || t('card.visit.title')}</h2>
            <p>{t('card.visit.text')}</p>
          </>
        )}
      </div>
    </div>
  )
}

// "GPUD5EPGW4D4" → "GPUD-5EPG-W4D4", easier to copy by hand. The dashes are fine to type:
// claiming ignores anything that isn't a letter or a number.
function groupGiftCode(code) {
  return code.match(/.{1,4}/g).join('-')
}
