import { useEffect, useRef, useState } from 'react'
import StreetView from './StreetView.jsx'
import FinishDialog from './ui/FinishDialog.jsx'
import LanternSheet from './ui/LanternSheet.jsx'
import KeeperLanterns from './ui/KeeperLanterns.jsx'
import ShareSheet from './ui/ShareSheet.jsx'
import Room from './inside/Room.jsx'
import {
  isNewLantern,
  loadHouse,
  loadKeeperLanterns,
  markLanternsSeen,
  saveHouseDesign,
  submitHouseDesign,
} from './data/houses.js'
import { hideLoadingScreen } from './ui/loadingScreen.js'
import { useI18n } from './i18n/i18n.jsx'
import { Link, navigate } from './router.jsx'
import { DoorIcon, FlameIcon, GiftIcon, HouseIcon } from './ui/icons.jsx'

// Wait this long after the last tap before saving, so a burst of taps becomes one save.
const SAVE_DELAY_MS = 700
// How long "Your house is ready" stays on screen after finishing.
const FINISHED_MESSAGE_MS = 6000

// A real house at /h/<code>, loaded from the database.
//   Keeper, design not final yet → can decorate, every change is saved, then "Make it final".
//   Keeper, design final         → looks at it.
//   Anyone else                  → looks at it. If nobody has claimed it yet, they're offered the gift-code page.
// Once claimed, everyone can step inside (/h/<code>/inside, the "inside" prop) to see the room,
// and visitors can light a lantern in the garden. The keeper sees who lit them, with the new ones marked.
export default function HouseTown({ code, inside }) {
  const { t } = useI18n()
  // 'loading' | 'missing' | 'failed' | 'ready'
  const [status, setStatus] = useState('loading')
  const [house, setHouse] = useState(null)
  const [saveFailed, setSaveFailed] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [justFinished, setJustFinished] = useState(false)
  const [lanternOpen, setLanternOpen] = useState(false)
  const [lanternLit, setLanternLit] = useState(false) // this visitor lit one during this visit
  // Keeper only: who lit the lanterns, { lanterns, seenUntil } (see loadKeeperLanterns). null until loaded.
  const [keeperLanterns, setKeeperLanterns] = useState(null)
  const [keeperLanternsFailed, setKeeperLanternsFailed] = useState(false)
  const [lanternListOpen, setLanternListOpen] = useState(false)
  const [shareOpen, setShareOpen] = useState(false) // keeper only: link, QR code and printable card
  // The newest lantern we've already told the database the keeper has seen, so we tell it only once.
  const seenSent = useRef(null)

  // The latest design that hasn't been sent to the database yet, and the timer that will send it.
  const unsaved = useRef(null)
  const saveTimer = useRef(null)

  function load() {
    setStatus('loading')
    setKeeperLanterns(null)
    loadHouse(code)
      .then((found) => {
        setHouse(found)
        setStatus(found ? 'ready' : 'missing')
        // Loaded straight away, so the keeper sees "2 new" on the lantern button without tapping it.
        if (found?.isKeeper && found.lanternCount > 0) loadLanternList()
      })
      .catch(() => setStatus('failed'))
  }

  function loadLanternList() {
    setKeeperLanternsFailed(false)
    loadKeeperLanterns(code).then(setKeeperLanterns, () => setKeeperLanternsFailed(true))
  }

  useEffect(load, [code])

  // Once the keeper has the list in front of them, the database remembers they've seen it,
  // so next time only lanterns lit after today count as new.
  // The "new" tags on screen stay until the list closes, so they can still tell which ones are new.
  useEffect(() => {
    const newest = keeperLanterns?.lanterns[0]
    if (!lanternListOpen || !newest || !isNewLantern(newest, keeperLanterns.seenUntil)) return
    if (seenSent.current === newest.id) return
    seenSent.current = newest.id
    // If this fails, they'll just show as new once more next time. Not worth an error message.
    markLanternsSeen(code, newest).catch(() => {})
  }, [lanternListOpen, keeperLanterns])

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

  // The new lantern appears in the garden right away; the sheet closes so the visitor can see it.
  function onLanternLit() {
    setHouse((current) => ({ ...current, lanternCount: current.lanternCount + 1 }))
    setLanternOpen(false)
    setLanternLit(true)
  }

  function closeLanternList() {
    setLanternListOpen(false)
    // They've seen them all now, so the "new" tags and the count on the button go away.
    setKeeperLanterns((current) => {
      const newest = current?.lanterns[0]
      if (!newest || !isNewLantern(newest, current.seenUntil)) return current
      return { ...current, seenUntil: newest.created_at }
    })
  }

  function onLanternRemoved(lantern) {
    setKeeperLanterns((current) => ({ ...current, lanterns: current.lanterns.filter((l) => l.id !== lantern.id) }))
    // It disappears from the garden too. With none left there's nothing to list.
    setHouse((current) => ({ ...current, lanternCount: current.lanternCount - 1 }))
    if (house.lanternCount === 1) setLanternListOpen(false)
  }

  function goInside() {
    navigate(`/h/${code}/inside`, { state: { fromStreet: true } })
  }

  function goOutside() {
    // Came in from the street? Then step back, so the phone's own Back button stays in step.
    // Opened the room straight from a link? Then swap it for the street.
    if (window.history.state?.fromStreet) window.history.back()
    else navigate(`/h/${code}`, { replace: true })
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
  let label = { title: name }
  if (canEdit) label = { title: t('yourHouse'), text: t('tapToDecorate') }
  else if (house.claimed) label = { title: name, text: t('room.tapToEnter') }

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
  } else if (lanternOpen) {
    bottom = (
      <LanternSheet
        code={code}
        count={house.lanternCount}
        onLit={onLanternLit}
        onClose={() => setLanternOpen(false)}
      />
    )
  } else if (shareOpen) {
    bottom = <ShareSheet code={code} onClose={() => setShareOpen(false)} />
  } else if (lanternListOpen) {
    bottom = (
      <KeeperLanterns
        list={keeperLanterns}
        failed={keeperLanternsFailed}
        count={house.lanternCount}
        onRetry={loadLanternList}
        onRemoved={onLanternRemoved}
        onClose={closeLanternList}
      />
    )
  } else {
    // Keepers don't light lanterns at their own house; the lanterns are for them.
    let lanternPart = null
    if (lanternLit) {
      lanternPart = (
        <p className="lantern-lit" role="status">
          <FlameIcon />
          {t('lantern.lit')}
        </p>
      )
    } else if (!house.isKeeper) {
      lanternPart = (
        <button type="button" className="big-button gold" onClick={() => setLanternOpen(true)}>
          <FlameIcon />
          {t('lantern.title')}
        </button>
      )
    } else if (house.lanternCount > 0) {
      // The keeper: see who lit them. Only once there's at least one.
      const newCount = keeperLanterns
        ? keeperLanterns.lanterns.filter((l) => isNewLantern(l, keeperLanterns.seenUntil)).length
        : 0
      lanternPart = (
        <button type="button" className="big-button gold" onClick={() => setLanternListOpen(true)}>
          <FlameIcon />
          {t('keeperLantern.title')}
          {newCount > 0 && <span className="new-chip">{t('keeperLantern.new').replace('{n}', newCount)}</span>}
        </button>
      )
    }
    bottom = (
      <div className="street-actions">
        {house.capsuleNews && (
          <p className="capsule-news" role="status">
            {t('capsule.news')}
          </p>
        )}
        {lanternPart}
        <button type="button" className="big-button accent" onClick={goInside}>
          <DoorIcon />
          {t('room.enter')}
        </button>
      </div>
    )
  }

  return (
    <>
      <StreetView
        plot={house.plot}
        design={house.design}
        lanterns={house.lanternCount}
        showAccount={house.isKeeper || house.isHelper}
        onShare={house.isKeeper ? () => setShareOpen(true) : undefined}
        focusHouse={lanternOpen || lanternListOpen || shareOpen}
        neighbours={house.neighbours}
        onChange={changeDesign}
        canEdit={canEdit}
        label={label}
        bottom={bottom}
        onFinish={() => setConfirming(true)}
        saveFailed={saveFailed}
        onDoneEditing={saveNow}
        onEnter={house.claimed ? goInside : undefined}
      />
      {inside && (
        <Room
          code={code}
          title={name}
          isKeeper={house.isKeeper}
          isHelper={house.isHelper}
          onLeave={goOutside}
          onCapsuleSeen={() => setHouse((current) => ({ ...current, capsuleNews: false }))}
        />
      )}
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
