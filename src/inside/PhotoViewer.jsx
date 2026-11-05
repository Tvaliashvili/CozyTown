import { useEffect, useRef, useState } from 'react'
import { movePhoto, takeDownPhoto } from '../data/inside.js'
import { useI18n } from '../i18n/i18n.jsx'
import { BackIcon, ForwardIcon, TrashIcon } from '../ui/icons.jsx'

// How far a finger must slide sideways before it counts as a swipe to the next photo.
const SWIPE_PX = 50

// A photo shown as big as the screen allows, with its caption. Arrows or a swipe go through all the
// photos in the house. Keeper and helpers can also hang it, move it to the album, or delete it
// (after an "are you sure?" step). Room.jsx gives this a key per photo, so each one starts fresh.
//   photos: every photo, in album order. freeFrame: the first empty frame, or -1 when the wall is full.
export default function PhotoViewer({ photo, photos, freeFrame, canDecorate, onShow, onMoved, onTakenDown, onClose }) {
  const { t } = useI18n()
  // 'looking' | 'moving' | 'moveFailed' | 'confirming' | 'removing' | 'failed'
  const [state, setState] = useState('looking')
  // The small copy is usually downloaded already, so it shows at once, even on slow internet.
  // The full photo takes over when it arrives. If it never does, the small one stays.
  const [fullReady, setFullReady] = useState(false)
  useEffect(() => {
    const full = new Image()
    full.onload = () => setFullReady(true)
    full.src = photo.url
    return () => {
      full.onload = null
    }
  }, [photo.url])

  const place = photos.findIndex((each) => each.id === photo.id)
  const several = photos.length > 1

  function showNext(step) {
    onShow(photos[(place + step + photos.length) % photos.length])
  }

  useEffect(() => {
    function onKey(event) {
      if (!several) return
      if (event.key === 'ArrowRight') showNext(1)
      if (event.key === 'ArrowLeft') showNext(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const swipeStart = useRef(null)
  function onTouchStart(event) {
    swipeStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY }
  }
  function onTouchEnd(event) {
    if (!swipeStart.current || !several) return
    const across = event.changedTouches[0].clientX - swipeStart.current.x
    const down = event.changedTouches[0].clientY - swipeStart.current.y
    swipeStart.current = null
    if (Math.abs(across) > SWIPE_PX && Math.abs(across) > Math.abs(down)) showNext(across < 0 ? 1 : -1)
  }

  async function takeDown() {
    setState('removing')
    try {
      await takeDownPhoto(photo)
      onTakenDown(photo)
    } catch {
      setState('failed')
    }
  }

  async function moveTo(slot) {
    setState('moving')
    try {
      onMoved(await movePhoto(photo, slot))
      setState('looking')
    } catch {
      setState('moveFailed')
    }
  }

  const looking = state === 'looking' || state === 'moving' || state === 'moveFailed'

  return (
    <div
      className="viewer"
      role="dialog"
      aria-modal="true"
      aria-label={photo.caption || t('room.photo')}
    >
      <div className="viewer-photo" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <img src={fullReady ? photo.url : photo.smallUrl} alt={photo.caption || ''} />
        {several && (
          <>
            <button type="button" className="viewer-arrow previous" onClick={() => showNext(-1)} aria-label={t('room.previous')}>
              <BackIcon />
            </button>
            <button type="button" className="viewer-arrow next" onClick={() => showNext(1)} aria-label={t('room.next')}>
              <ForwardIcon />
            </button>
          </>
        )}
      </div>
      {photo.caption && <p className="viewer-caption">{photo.caption}</p>}
      {several && <p className="viewer-count">{place + 1} / {photos.length}</p>}

      {looking ? (
        <>
          {state === 'moveFailed' && (
            <p className="viewer-note" role="alert">{t('room.takeDownFailed')}</p>
          )}
          {canDecorate && photo.slot === null && freeFrame === -1 && (
            <p className="viewer-note">{t('room.noFreeFrame')}</p>
          )}
          <div className="viewer-buttons">
            {canDecorate && photo.slot === null && freeFrame !== -1 && (
              <button type="button" className="big-button soft viewer-move" onClick={() => moveTo(freeFrame)} disabled={state === 'moving'}>
                {t('room.toWall')}
              </button>
            )}
            {canDecorate && photo.slot !== null && (
              <button type="button" className="big-button soft viewer-move" onClick={() => moveTo(null)} disabled={state === 'moving'}>
                {t('room.toAlbum')}
              </button>
            )}
            {canDecorate && (
              <button type="button" className="big-button soft viewer-delete" onClick={() => setState('confirming')} disabled={state === 'moving'}>
                <TrashIcon />
                {t('room.takeDown')}
              </button>
            )}
            <button type="button" className="big-button" onClick={onClose}>
              {t('room.close')}
            </button>
          </div>
        </>
      ) : (
        <div className="viewer-confirm">
          <p>{t('room.takeDownSure')}</p>
          {state === 'failed' && (
            <p className="error" role="alert">
              {t('room.takeDownFailed')}
            </p>
          )}
          <div className="viewer-buttons">
            <button type="button" className="big-button accent" onClick={takeDown} disabled={state === 'removing'}>
              {state === 'removing' ? t('room.takingDown') : t('room.takeDownYes')}
            </button>
            <button type="button" className="big-button" onClick={() => setState('looking')} disabled={state === 'removing'}>
              {t('room.keepIt')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
