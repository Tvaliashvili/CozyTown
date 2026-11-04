import { useEffect, useRef, useState } from 'react'
import { loadTownMap } from '../data/map.js'
import { useI18n } from '../i18n/i18n.jsx'
import { useBackState } from '../lib/useBackState.js'
import { Link } from '../router.jsx'
import { BackIcon } from '../ui/icons.jsx'
import LanguageToggle from '../ui/LanguageToggle.jsx'
import { hideLoadingScreen } from '../ui/loadingScreen.js'
import { MAP_PLACES } from './places.js'
import './map.css'

// /map: a flat drawing of the town you tap. Deliberately not 3D, so it's light on budget phones.
// It's only for looking around: a QR code still goes straight to its house.
export default function MapPage() {
  const { t, lang } = useI18n()
  // null while loading, then the list of neighbourhoods.
  const [town, setTown] = useState(null)
  const [failed, setFailed] = useState(false)
  // useBackState: the phone's Back button closes the sheet instead of leaving the map.
  const [openSlug, setOpenSlug] = useBackState(null)

  function load() {
    setFailed(false)
    loadTownMap().then(setTown, () => setFailed(true))
  }

  useEffect(load, [])
  useEffect(hideLoadingScreen, [])

  const openHood = town?.find((hood) => hood.slug === openSlug)

  return (
    <div className="map-page">
      <header className="map-top">
        <div className="map-nav">
          <Link to="/" className="pill-button glass" aria-label={t('street.home')}>
            <BackIcon />
          </Link>
          <LanguageToggle className="pill-button glass" />
        </div>
        <h1>{t('map.title')}</h1>
        <p>{t('map.intro')}</p>
      </header>

      <main className="map-board">
        <img src="/art/town-map.svg" alt="" className="map-art" />

        {/* Tapping the drawing itself: each neighbourhood's part of it is an invisible shape.
            The name buttons below stay the real controls (keyboard, screen readers); these only add
            a bigger place to tap, which is why they're hidden from assistive tech. */}
        {town && (
          <svg className="map-areas" viewBox="0 0 400 600" preserveAspectRatio="none" aria-hidden="true">
            {town.map((hood) => {
              const place = MAP_PLACES[hood.slug]
              if (!place) return null
              return (
                <polygon
                  key={hood.slug}
                  points={place.area.map(([x, y]) => `${x},${y}`).join(' ')}
                  onClick={() => setOpenSlug(hood.slug)}
                />
              )
            })}
          </svg>
        )}

        {town?.map((hood) => {
          const place = MAP_PLACES[hood.slug]
          if (!place) return null
          const isOpen = hood.streets.some((street) => street.open)
          return (
            <button
              key={hood.slug}
              type="button"
              className={isOpen ? 'map-place open' : 'map-place'}
              style={{ left: `${place.label.x}%`, top: `${place.label.y}%` }}
              onClick={() => setOpenSlug(hood.slug)}
            >
              <strong>{lang === 'ka' ? hood.nameKa : hood.nameEn}</strong>
              {!isOpen && <span>{t('map.opensLater')}</span>}
            </button>
          )
        })}
      </main>

      {failed && (
        <div className="map-failed" role="alert">
          <p>{t('map.failed')}</p>
          <button type="button" className="big-button accent" onClick={load}>{t('tryAgain')}</button>
        </div>
      )}

      {openHood && <HoodSheet hood={openHood} onClose={() => setOpenSlug(null)} />}
    </div>
  )
}

// What opens when you tap a neighbourhood: a few words about it and its open streets.
function HoodSheet({ hood, onClose }) {
  const { t, lang } = useI18n()
  const titleRef = useRef(null)
  const streets = hood.streets.filter((street) => street.open)

  // So a screen reader starts reading here when the sheet opens.
  useEffect(() => titleRef.current?.focus(), [])

  return (
    <div className="map-sheet-backdrop" onClick={onClose}>
      <div className="map-sheet" role="dialog" aria-modal="true" aria-labelledby="map-sheet-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="map-sheet-title" ref={titleRef} tabIndex={-1}>{lang === 'ka' ? hood.nameKa : hood.nameEn}</h2>
        <p>{t(`map.about.${hood.slug}`)}</p>

        {streets.length === 0 && <p className="map-sheet-later">{t('map.notOpenYet')}</p>}
        {streets.length > 0 && (
          <ul className="map-streets">
            {streets.map((street) => (
              <li key={street.slug}>
                {/* state: remembered so the street's back button can step back here (see StreetVisit). */}
                <Link to={`/map/${street.slug}`} state={{ fromMap: true }} className="map-street">
                  <strong>{lang === 'ka' ? street.nameKa : street.nameEn}</strong>
                  {/* No "7 of 8 plots free": while the town is small that only says how empty it is.
                      A full street is a good sign, so that one is said. */}
                  {street.takenPlots >= street.plotCount && <span>{t('map.streetFull')}</span>}
                </Link>
              </li>
            ))}
          </ul>
        )}

        <button type="button" className="big-button soft" onClick={onClose}>{t('map.close')}</button>
      </div>
    </div>
  )
}
