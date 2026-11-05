import { useEffect, useRef, useState } from 'react'
import RoomArt from './RoomArt.jsx'
import AddPhoto from './AddPhoto.jsx'
import AddMany from './AddMany.jsx'
import Album from './Album.jsx'
import PhotoViewer from './PhotoViewer.jsx'
import Letters from './Letters.jsx'
import Capsule, { countInside } from './Capsule.jsx'
import Helpers from './Helpers.jsx'
import LanguageToggle from '../ui/LanguageToggle.jsx'
import { ALBUM_SPOT, FRAMES } from './frames.js'
import { PHOTO_LIMIT, inAlbumOrder, loadLetters, loadPhotos } from '../data/inside.js'
import { loadCapsule } from '../data/capsule.js'
import { formatDay } from '../lib/formatDate.js'
import { useI18n } from '../i18n/i18n.jsx'
import { useBackState } from '../lib/useBackState.js'
import { AddPhotoIcon, AlbumIcon, BackIcon, DownloadIcon, LetterIcon, LockIcon, PeopleIcon, PlusIcon, ShareIcon } from '../ui/icons.jsx'
import './room.css'

// The room inside a house (/h/<code>/inside). It covers the street, which stays loaded underneath.
//   Keeper  → adds photos (the 5 frames fill first, then the album), reads and writes letters,
//             fills the time capsule, shares the house link, invites helpers.
//   Helper  → the same, except inviting others; they only see the letters they wrote themselves.
//   Visitor → looks at the photos. Letters are private, so visitors don't see them at all.
// onCapsuleSeen: called when the keeper opens a time capsule whose day has come,
// so the street stops saying "your time capsule has opened".
// design: the outside of the house, drawn on the offline page in the "Download everything" zip.
// newLetter: the mailbox flag is up. onLettersSeen: the keeper has the letters in front of them.
export default function Room({ code, title, design, isKeeper, isHelper, newLetter, onLeave, onCapsuleSeen, onLettersSeen }) {
  const { t, lang } = useI18n()
  const canDecorate = isKeeper || isHelper
  const [photos, setPhotos] = useState(null) // null = still loading
  const [photosFailed, setPhotosFailed] = useState(false)
  const [letters, setLetters] = useState(null) // keeper and helpers; null = still loading
  const [lettersFailed, setLettersFailed] = useState(false)
  // useBackState: the phone's Back button closes these pages, instead of leaving the room.
  const [adding, setAdding] = useBackState(null) // { files, slot } while adding photos
  const [viewing, setViewing] = useBackState(null) // the photo opened full screen
  const [albumOpen, setAlbumOpen] = useBackState(false)
  const [lettersOpen, setLettersOpen] = useBackState(false)
  // Keeper and helpers: the time capsule chest. undefined = still loading, null = no chest yet.
  const [capsule, setCapsule] = useState(undefined)
  const [capsuleFailed, setCapsuleFailed] = useState(false)
  const [capsuleOpen, setCapsuleOpen] = useBackState(false)
  const [helpersOpen, setHelpersOpen] = useBackState(false) // keeper only

  // One hidden file picker for everything; slotToFill remembers which frame asked for it, if any.
  const fileInput = useRef(null)
  const slotToFill = useRef(null)

  function loadEverything() {
    setPhotosFailed(false)
    loadPhotos(code).then(setPhotos, () => setPhotosFailed(true))
    if (canDecorate) {
      setLettersFailed(false)
      loadLetters(code).then(setLetters, () => setLettersFailed(true))
      loadChest()
    }
  }

  function loadChest() {
    setCapsuleFailed(false)
    loadCapsule(code).then(setCapsule, () => setCapsuleFailed(true))
  }

  function showCapsule() {
    if (capsuleFailed) {
      loadChest()
      return
    }
    setCapsuleOpen(true)
    if (capsule?.isOpen) onCapsuleSeen?.()
  }

  // What the time capsule card says under its title.
  let capsuleText = isKeeper ? t('capsule.cardNew') : t('capsule.cardNoDate')
  if (capsuleFailed) capsuleText = t('capsule.cardFailed')
  else if (capsule?.isOpen) capsuleText = t('capsule.cardOpen')
  else if (capsule) {
    capsuleText = `${t('capsule.cardLocked').replace('{date}', formatDay(capsule.opensOn, lang))} · ${countInside(t, capsule.itemCount)}`
  }

  useEffect(loadEverything, [code, canDecorate])

  // The flag goes down only once the keeper can really see the letters, not if they failed to load.
  useEffect(() => {
    if (lettersOpen && letters && isKeeper && newLetter) onLettersSeen?.()
  }, [lettersOpen, letters, isKeeper, newLetter])

  const lettersGlow = isKeeper && newLetter

  // { slot: photo } so each frame can find its photo. Photos with no slot are only in the album.
  const photoInFrame = {}
  for (const photo of photos ?? []) {
    if (photo.slot !== null) photoInFrame[photo.slot] = photo
  }
  const emptyFrames = FRAMES.map((_, slot) => slot).filter((slot) => !photoInFrame[slot])
  const firstEmptyFrame = emptyFrames[0] ?? -1
  const houseFull = (photos?.length ?? 0) >= PHOTO_LIMIT
  // Visitors only get the album when it shows them something the walls don't.
  const showAlbum = photos !== null && (canDecorate || photos.some((photo) => photo.slot === null))

  // Tapping an empty frame: one photo, for that frame.
  function pickPhotoFor(slot) {
    if (houseFull) {
      setAlbumOpen(true) // it says why nothing more fits
      return
    }
    openPicker(slot, false)
  }

  // The "Add photos" buttons: as many as fit.
  function pickPhotos() {
    openPicker(null, true)
  }

  function openPicker(slot, many) {
    slotToFill.current = slot
    fileInput.current.multiple = many
    fileInput.current.value = '' // so choosing the same photo again still counts
    fileInput.current.click()
  }

  // The plan is made once, here, so frames filling up while photos arrive can't change it.
  function onFileChosen(event) {
    const chosen = [...event.target.files]
    if (chosen.length === 0) return
    const roomLeft = PHOTO_LIMIT - photos.length
    setAdding({
      files: chosen.slice(0, roomLeft),
      noRoom: Math.max(0, chosen.length - roomLeft),
      slot: slotToFill.current ?? emptyFrames[0] ?? null,
      frames: emptyFrames,
    })
  }

  function onAdded(photo) {
    setPhotos((current) => inAlbumOrder([...current, photo]))
  }

  function onHung(photo) {
    onAdded(photo)
    setAdding(null)
  }

  function onMoved(photo) {
    setPhotos((current) => inAlbumOrder(current.map((p) => (p.id === photo.id ? photo : p))))
    setViewing(photo)
  }

  function onTakenDown(photo) {
    setPhotos((current) => current.filter((p) => p.id !== photo.id))
    setViewing(null)
  }

  const counts = []
  if (photos) counts.push(countText(t, photos.length, 'room.photos'))
  if (canDecorate && letters) counts.push(countText(t, letters.length, 'room.letters'))

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
                    <img src={photo.smallUrl} alt="" decoding="async" />
                  </button>
                )
              }
              // Visitors don't see empty frames; there's nothing for them to do with one.
              if (!canDecorate) return null
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
          {showAlbum && (
            <button
              type="button"
              className="album-spot"
              style={{ '--x': ALBUM_SPOT.x, '--y': ALBUM_SPOT.y, '--w': ALBUM_SPOT.width, '--h': ALBUM_SPOT.height }}
              onClick={() => setAlbumOpen(true)}
              aria-label={t('album.open')}
            />
          )}
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
          {canDecorate && <ShareButton code={code} title={title} />}
        </div>

        {canDecorate ? (
          <>
            <button
              type="button"
              className="big-button accent"
              onClick={pickPhotos}
              disabled={photos === null || houseFull}
            >
              <AddPhotoIcon />
              {houseFull ? t('album.full') : t('room.addPhoto')}
            </button>
            {houseFull && <p className="room-note">{t('album.fullHint')}</p>}

            {showAlbum && (
              <button type="button" className="room-card" onClick={() => setAlbumOpen(true)}>
                <AlbumIcon />
                <span>
                  <strong>{t('album.title')}</strong>
                  <span>{t('album.count').replace('{n}', photos.length).replace('{max}', PHOTO_LIMIT)}</span>
                </span>
              </button>
            )}

            <button type="button" className={lettersGlow ? 'room-card glowing' : 'room-card'} onClick={() => setLettersOpen(true)}>
              <LetterIcon />
              <span>
                <strong>{t('room.lettersTitle')}</strong>
                <span>{lettersGlow ? t('room.lettersNew') : t('room.lettersText')}</span>
              </span>
            </button>

            {(capsule !== undefined || capsuleFailed) && (
              <button type="button" className={capsule?.isOpen ? 'room-card glowing' : 'room-card'} onClick={showCapsule}>
                <LockIcon />
                <span>
                  <strong>{t('capsule.title')}</strong>
                  <span>{capsuleText}</span>
                </span>
              </button>
            )}

            {isKeeper && (
              <button type="button" className="room-card" onClick={() => setHelpersOpen(true)}>
                <PeopleIcon />
                <span>
                  <strong>{t('helpers.title')}</strong>
                  <span>{t('helpers.cardText')}</span>
                </span>
              </button>
            )}
            {isHelper && <p className="room-note">{t('helpers.youHelp')}</p>}
            {isKeeper && <ExportButton code={code} title={title} design={design} />}
          </>
        ) : (
          <>
            {showAlbum && (
              <button type="button" className="room-card" onClick={() => setAlbumOpen(true)}>
                <AlbumIcon />
                <span>
                  <strong>{t('album.title')}</strong>
                  <span>{countText(t, photos.length, 'room.photos')}</span>
                </span>
              </button>
            )}
            {photos?.length > 0 && <p className="room-note">{t('room.visitorNote')}</p>}
          </>
        )}
      </section>

      <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFileChosen} />

      {albumOpen && (
        <Album
          photos={photos ?? []}
          canDecorate={canDecorate}
          onAdd={pickPhotos}
          onOpenPhoto={setViewing}
          onClose={() => setAlbumOpen(false)}
        />
      )}
      {/* One photo that fits gets the box with a preview and words. Anything else, even a single photo
          that no longer fits because a helper just took the last place, goes to the box that can say so. */}
      {adding && adding.files.length === 1 && adding.noRoom === 0 && (
        <AddPhoto code={code} file={adding.files[0]} slot={adding.slot} onHung={onHung} onCancel={() => setAdding(null)} />
      )}
      {adding && !(adding.files.length === 1 && adding.noRoom === 0) && (
        <AddMany
          code={code}
          files={adding.files}
          noRoom={adding.noRoom}
          freeFrames={adding.frames}
          onAdded={onAdded}
          onClose={() => setAdding(null)}
        />
      )}
      {viewing && (
        <PhotoViewer
          key={viewing.id}
          photo={viewing}
          photos={photos ?? []}
          freeFrame={firstEmptyFrame}
          canDecorate={canDecorate}
          onShow={setViewing}
          onMoved={onMoved}
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
          onlyOwn={!isKeeper}
        />
      )}
      {helpersOpen && <Helpers code={code} onClose={() => setHelpersOpen(false)} />}
      {capsuleOpen && (
        <Capsule
          code={code}
          capsule={capsule}
          isKeeper={isKeeper}
          onChange={setCapsule}
          onClose={() => setCapsuleOpen(false)}
        />
      )}
    </div>
  )
}

// "Download everything": a zip of every photo and letter with a page that works offline.
// The export code (and the zip library) only downloads when the button is pressed.
function ExportButton({ code, title, design }) {
  const { t, lang } = useI18n()
  // 'idle' | 'working' | 'done' | 'failed'
  const [state, setState] = useState('idle')

  async function download() {
    setState('working')
    try {
      const { exportHouse } = await import('../export/exportHouse.js')
      await exportHouse({ code, title, design, t, lang })
      setState('done')
    } catch {
      setState('failed')
    }
  }

  return (
    <div className="room-export">
      <button type="button" className="link-button quiet" onClick={download} disabled={state === 'working'}>
        <DownloadIcon />
        {state === 'working' ? t('export.working') : t('export.button')}
      </button>
      <p className="room-note" role="status">
        {state === 'done' && t('export.done')}
        {state === 'failed' && t('export.failed')}
        {(state === 'idle' || state === 'working') && t('export.hint')}
      </p>
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
