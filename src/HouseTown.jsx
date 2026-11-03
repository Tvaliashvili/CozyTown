import { useEffect, useRef, useState } from 'react'
import StreetView from './StreetView.jsx'
import FinishDialog from './ui/FinishDialog.jsx'
import { loadHouse, saveHouseDesign, submitHouseDesign } from './data/houses.js'
import { hideLoadingScreen } from './ui/loadingScreen.js'
import { useI18n } from './i18n/i18n.jsx'
import { Link } from './router.jsx'
import { GiftIcon, HouseIcon } from './ui/icons.jsx'

// Wait this long after the last tap before saving, so a burst of taps becomes one save.
const SAVE_DELAY_MS = 700
// How long "Your house is ready" stays on screen after finishing.
const FINISHED_MESSAGE_MS = 6000

// A real house at /h/<code>, loaded from the database.
//   Keeper, design not final yet → can decorate, every change is saved, then "Make it final".
//   Keeper, design final         → looks at it (the inside of the house comes next).
//   Anyone else                  → looks at it. If nobody has claimed it yet, they're offered the gift-code page.
export default function HouseTown({ code }) {
  const { t } = useI18n()
  // 'loading' | 'missing' | 'failed' | 'ready'
  const [status, setStatus] = useState('loading')
  const [house, setHouse] = useState(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [justFinished, setJustFinished] = useState(false)

  // The latest design that hasn't been sent to the database yet, and the timer that will send it.
  const unsaved = useRef(null)
  const saveTimer = useRef(null)

  function load() {
    setStatus('loading')
    loadHouse(code)
      .then((found) => {
        setHouse(found)
        setStatus(found ? 'ready' : 'missing')
      })
      .catch(() => setStatus('failed'))
  }

  useEffect(load, [code])

  // The town hides the loading screen itself once it's drawn; error pages have to do it here.
  useEffect(() => {
    if (status === 'missing' || status === 'failed') hideLoadingScreen()
  }, [status])

  function saveNow() {
    clearTimeout(saveTimer.current)
    const design = unsaved.current
    if (!design) return
    unsaved.current = null
    saveHouseDesign(code, design).then(
      () => setSaveFailed(false),
      () => setSaveFailed(true),
    )
  }

  // Don't lose the last taps if the phone locks or the page closes before the timer fires.
  useEffect(() => {
    function onHide() {
      if (document.visibilityState === 'hidden') saveNow()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      saveNow()
    }
  }, [])

  function changeDesign(design) {
    setHouse((current) => ({ ...current, design }))
    unsaved.current = design
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(saveNow, SAVE_DELAY_MS)
  }

  // Called by the "Yes, make it final" button. Throws on failure so the dialog can say so.
  async function finish() {
    // The final design is sent in full here, so a pending save isn't needed any more.
    clearTimeout(saveTimer.current)
    unsaved.current = null
    await submitHouseDesign(code, house.design)
    setHouse((current) => ({ ...current, designFinal: true }))
    setConfirming(false)
    setJustFinished(true)
    setTimeout(() => setJustFinished(false), FINISHED_MESSAGE_MS)
  }

  if (status === 'missing') {
    return <HouseMessage title={t('house.missing.title')} text={t('house.missing.text')} />
  }
  if (status === 'failed') {
    return (
      <HouseMessage title={t('house.failed.title')} text={t('house.failed.text')}>
        <button className="big-button accent" onClick={load}>
          {t('tryAgain')}
        </button>
      </HouseMessage>
    )
  }
  // While loading, the loading screen from index.html is still showing.
  if (status === 'loading') return <div className="app" />

  const canEdit = house.isKeeper && !house.designFinal
  const name = house.title || (house.isKeeper ? t('yourHouse') : t('house.aCozyHouse'))
  const label = canEdit ? { title: t('yourHouse'), text: t('tapToDecorate') } : { title: name }

  let bottom = null // null = the usual "slide your finger" hint
  if (justFinished) {
    bottom = (
      <p className="hint finished" role="status">
        {t('finish.done')}
      </p>
    )
  } else if (!house.claimed) {
    // Most likely the person who got the gift, scanning the QR code before signing in.
    bottom = (
      <Link to="/signin" className="big-button accent gift-call">
        <GiftIcon />
        {t('house.claimIt')}
      </Link>
    )
  }

  return (
    <>
      <StreetView
        plot={house.plot}
        design={house.design}
        neighbours={house.neighbours}
        onChange={changeDesign}
        canEdit={canEdit}
        label={label}
        bottom={bottom}
        onFinish={() => setConfirming(true)}
        saveFailed={saveFailed}
        onDoneEditing={saveNow}
      />
      {confirming && <FinishDialog onConfirm={finish} onCancel={() => setConfirming(false)} />}
    </>
  )
}

// A simple full-screen message on the dusk sky, for "no such house" and "didn't load".
function HouseMessage({ title, text, children }) {
  const { t } = useI18n()
  return (
    <div className="app house-message">
      <div className="dialog">
        <div className="dialog-icon" aria-hidden="true">
          <HouseIcon />
        </div>
        <h2>{title}</h2>
        <p>{text}</p>
        {children}
        <Link to="/" className="big-button soft">
          {t('house.home')}
        </Link>
      </div>
    </div>
  )
}
