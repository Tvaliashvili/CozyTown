import { useEffect, useRef, useState } from 'react'
import RoomArt from './RoomArt.jsx'
import AddPhoto from './AddPhoto.jsx'
import PhotoViewer from './PhotoViewer.jsx'
import Letters from './Letters.jsx'
import LanguageToggle from '../ui/LanguageToggle.jsx'
import { FRAMES } from './frames.js'
import { loadLetters, loadPhotos } from '../data/inside.js'
import { useI18n } from '../i18n/i18n.jsx'
import { AddPhotoIcon, BackIcon, LetterIcon, PlusIcon, ShareIcon } from '../ui/icons.jsx'
import './room.css'

// The room inside a house (/h/<code>/inside). It covers the street, which stays loaded underneath.
//   Keeper  → hangs photos in the frames, reads and writes letters, shares the house link.
//   Visitor → looks at the photos. Letters are private, so visitors don't see them at all.
export default function Room({ code, title, isKeeper, onLeave }) {
  const { t } = useI18n()
  const [photos, setPhotos] = useState(null) // null = still loading
  const [photosFailed, setPhotosFailed] = useState(false)
  const [letters, setLetters] = useState(null) // keeper only; null = still loading
  const [lettersFailed, setLettersFailed] = useState(false)
  const [adding, setAdding] = useState(null) // { file, slot } while "Hang this photo?" is open
  const [viewing, setViewing] = useState(null) // the photo opened full screen
  const [lettersOpen, setLettersOpen] = useState(false)

  // One hidden file picker for every frame; slotToFill remembers which frame asked for it.
  const fileInput = useRef(null)
  const slotToFill = useRef(null)

  function loadEverything() {
    setPhotosFailed(false)
    loadPhotos(code).then(setPhotos, () => setPhotosFailed(true))
    if (isKeeper) {
      setLettersFailed(false)
      loadLetters(code).then(setLetters, () => setLettersFailed(true))
    }
  }

  useEffect(loadEverything, [code, isKeeper])

  // { slot: photo } so each frame can find its photo.
  const photoInFrame = {}
  for (const photo of photos ?? []) photoInFrame[photo.slot] = photo
  const firstEmptyFrame = FRAMES.findIndex((_, slot) => !photoInFrame[slot])
  const wallFull = photos !== null && firstEmptyFrame === -1

  function pickPhotoFor(slot) {
    slotToFill.current = slot
    fileInput.current.value = '' // so choosing the same photo again still counts
    fileInput.current.click()
  }

  function onFileChosen(event) {
    const file = event.target.files[0]
    if (file) setAdding({ file, slot: slotToFill.current })
  }

  function onHung(photo) {
    setPhotos((current) => [...current, photo])
    setAdding(null)
  }

  function onTakenDown(photo) {
    setPhotos((current) => current.filter((p) => p.id !== photo.id))
    setViewing(null)
  }

  const counts = []
  if (photos) counts.push(countText(t, photos.length, 'room.photos'))
  if (isKeeper && letters) counts.push(countText(t, letters.length, 'room.letters'))

  return (
    <div className="room">
      <div className="room-scene">
        <div className="room-stage">
          <RoomArt />
          {photos &&
            FRAMES.map((frame, slot) => {
              const photo = photoInFrame[slot]
              // Frames are placed in drawing units; room.css turns them into screen sizes.
              const place = {
                '--x': frame.x,
                '--y': frame.y,
                '--w': frame.width,
                '--h': frame.height,
                '--tilt': `${frame.tilt}deg`,
              }
              if (photo) {
                return (
                  <button
                    key={slot}
                    type="button"
                    className={`frame ${frame.look}`}
                    style={place}
                    onClick={() => setViewing(photo)}
                    aria-label={photo.caption || t('room.photo')}
                  >
                    <img src={photo.url} alt="" decoding="async" />
                  </button>
                )
              }
              // Visitors don't see empty frames; there's nothing for them to do with one.
              if (!isKeeper) return null
              return (
                <button
                  key={slot}
                  type="button"
                  className="frame empty"
                  style={place}
                  onClick={() => pickPhotoFor(slot)}
                  aria-label={t('room.addHere')}
                >
                  <PlusIcon />
                </button>
              )
            })}
        </div>

        {photosFailed && (
          <div className="room-problem" role="alert">
            <p>{t('room.photosFailed')}</p>
            <button type="button" className="pill-button accent" onClick={loadEverything}>
              {t('tryAgain')}
            </button>
          </div>
        )}
      </div>

      <header className="room-top">
        <button type="button" className="pill-button" onClick={onLeave}>
          <BackIcon />
          {t('room.street')}
        </button>
        <LanguageToggle />
      </header>

      <section className="room-sheet" aria-labelledby="room-title">
        <div className="room-sheet-top">
          <div>
            <h1 id="room-title">{title}</h1>
            {counts.length > 0 && <p>{counts.join(' · ')}</p>}
          </div>
          {isKeeper && <ShareButton code={code} title={title} />}
        </div>

        {isKeeper ? (
          <>
            <button
              type="button"
              className="big-button accent"
              onClick={() => pickPhotoFor(firstEmptyFrame)}
              disabled={photos === null || wallFull}
            >
              <AddPhotoIcon />
              {wallFull ? t('room.wallFull') : t('room.addPhoto')}
            </button>
            {wallFull && <p className="room-note">{t('room.wallFullHint')}</p>}

            <button type="button" className="room-card" onClick={() => setLettersOpen(true)}>
              <LetterIcon />
              <span>
                <strong>{t('room.lettersTitle')}</strong>
                <span>{t('room.lettersText')}</span>
              </span>
            </button>
          </>
        ) : (
          photos?.length > 0 && <p className="room-note">{t('room.visitorNote')}</p>
        )}
      </section>

      <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFileChosen} />

      {adding && (
        <AddPhoto code={code} file={adding.file} slot={adding.slot} onHung={onHung} onCancel={() => setAdding(null)} />
      )}
      {viewing && (
        <PhotoViewer
          photo={viewing}
          canTakeDown={isKeeper}
          onTakenDown={onTakenDown}
          onClose={() => setViewing(null)}
        />
      )}
      {lettersOpen && (
        <Letters
          code={code}
          letters={letters}
          failed={lettersFailed}
          onRetry={loadEverything}
          onChange={setLetters}
          onClose={() => setLettersOpen(false)}
        />
      )}
    </div>
  )
}

// "1 photo" / "3 photos". Georgian doesn't change the word after a number, so there both texts match.
function countText(t, n, key) {
  return t(n === 1 ? `${key}.one` : `${key}.many`).replace('{n}', n)
}

// Sends the house link through the phone's own share menu (Viber, WhatsApp, Messenger...).
// Computers without a share menu copy the link instead.
function ShareButton({ code, title }) {
  const { t } = useI18n()
  const [copied, setCopied] = useState(false)

  async function share() {
    const url = `${window.location.origin}/h/${code}`
    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        // Closing the share menu without picking anything also lands here. Nothing to do.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      window.prompt(t('room.copyThis'), url)
    }
  }

  return (
    <button type="button" className="pill-button soft" onClick={share}>
      <ShareIcon />
      <span role="status">{copied ? t('room.copied') : t('room.share')}</span>
    </button>
  )
}
