import { useEffect, useState } from 'react'
import StreetView from '../StreetView.jsx'
import { loadStreetOutsides } from '../data/map.js'
import { useI18n } from '../i18n/i18n.jsx'
import { Link, navigate } from '../router.jsx'
import { HouseIcon } from '../ui/icons.jsx'
import { hideLoadingScreen } from '../ui/loadingScreen.js'

// /map/<street>: walking down a street from the map. Outsides only: no house is highlighted,
// and tapping one does nothing, because a house opens only with its own link.
export default function StreetVisit({ slug }) {
  const { t, lang } = useI18n()
  // 'loading' | 'closed' | 'failed' | 'ready'
  const [status, setStatus] = useState('loading')
  const [street, setStreet] = useState(null)

  function load() {
    setStatus('loading')
    loadStreetOutsides(slug).then(
      (found) => {
        setStreet(found)
        setStatus(found ? 'ready' : 'closed')
      },
      () => setStatus('failed'),
    )
  }

  useEffect(load, [slug])

  // The town hides the loading screen itself once it's drawn; messages have to do it here.
  useEffect(() => {
    if (status === 'closed' || status === 'failed') hideLoadingScreen()
  }, [status])

  // Came from the map? Then step back, so the phone's own Back button stays in step.
  // Opened straight from a link? Then swap this page for the map.
  function backToMap(event) {
    event.preventDefault()
    if (window.history.state?.fromMap) window.history.back()
    else navigate('/map', { replace: true })
  }

  if (status === 'loading') return <div className="app" />
  if (status !== 'ready') {
    return (
      <div className="app house-message">
        <div className="dialog">
          <div className="dialog-icon" aria-hidden="true">
            <HouseIcon />
          </div>
          <h2>{status === 'closed' ? t('map.streetClosed.title') : t('map.failed')}</h2>
          {status === 'closed' && <p>{t('map.streetClosed.text')}</p>}
          {status === 'failed' && (
            <button type="button" className="big-button accent" onClick={load}>{t('tryAgain')}</button>
          )}
          <Link to="/map" className="big-button soft">{t('map.backToMap')}</Link>
        </div>
      </div>
    )
  }

  return (
    <StreetView
      plot={null}
      neighbours={street.designs}
      neighbourSigns={street.signs}
      subtitle={lang === 'ka' ? street.nameKa : street.nameEn}
      backTo="/map"
      backLabel={t('map.backToMap')}
      onBack={backToMap}
    />
  )
}
