import { useEffect, useRef, useState } from 'react'
import { deleteOpenedCapsule, loadCapsule, openCapsule, sealCapsule } from '../data/capsule.js'
import { useI18n } from '../i18n/i18n.jsx'
import { formatDate, formatDay } from '../lib/formatDate.js'
import { shrinkPhoto } from '../lib/shrinkPhoto.js'
import { useBackState } from '../lib/useBackState.js'
import { AddPhotoIcon, BackIcon, LockIcon } from '../ui/icons.jsx'

// The database refuses more than this too (seal_capsule in 20261107000000_seal_capsule_once.sql).
const MAX_PHOTOS = 10

// The time capsule: a full-screen page over the room, like the mailbox. For people who decorate.
// capsule lives in Room (its card shows the date): null = not sealed yet, otherwise
// { opensOn, itemCount, isOpen }. onChange gives Room the new state.
//
//   Not sealed yet → the keeper writes a letter, adds photos, picks the day, and locks it, all at once.
//                    A last step warns that this can't be undone. Helpers just see "not made yet".
//   Locked         → shows the day it opens. Nothing more can go in, and the day can't change.
//   Open           → read everything inside. The keeper can delete it, after a warning, and make a new one.
export default function Capsule({ code, capsule, isKeeper, onChange, onClose }) {
  const { t, lang } = useI18n()
  // 'main' | 'confirm' (the "are you sure?" step) | 'delete' (the warning before deleting).
  // The phone's Back button goes back to 'main'.
  const [view, setView] = useBackState('main')
  const [sealed, setSealed] = useState(false) // just locked it
  // A screen reader starts reading from the title when the page opens or changes view.
  const heading = useRef(null)
  useEffect(() => heading.current?.focus(), [view])

  function back() {
    if (view !== 'main') setView('main')
    else onClose()
  }

  let content
  if (capsule?.isOpen && view === 'delete') {
    content = (
      <DeleteCapsule
        code={code}
        onCancel={() => setView('main')}
        onDeleted={() => {
          onChange(null)
          setView('main')
        }}
      />
    )
  } else if (capsule?.isOpen) {
    content = <OpenedCapsule code={code} capsule={capsule} onDelete={isKeeper ? () => setView('delete') : null} />
  } else if (capsule) {
    content = (
      <>
        <LockedChest capsule={capsule} />
        {sealed && (
          <p className="capsule-sealed" role="status">
            {t('capsule.sealed').replace('{date}', formatDay(capsule.opensOn, lang))}
          </p>
        )}
      </>
    )
  } else if (isKeeper) {
    content = (
      <FillCapsule
        code={code}
        confirming={view === 'confirm'}
        onConfirm={() => setView('confirm')}
        onEdit={() => setView('main')}
        onSealed={(chest) => {
          onChange(chest)
          setSealed(true)
          setView('main')
        }}
        onAlreadySealed={() => loadCapsule(code).then(onChange, () => {})}
      />
    )
  } else {
    content = <p className="capsule-text">{t('capsule.notMadeHelper')}</p>
  }

  return (
    <div className="letters" role="dialog" aria-modal="true" aria-labelledby="capsule-title">
      <div className="letters-inner">
        <div className="letters-head">
          <button type="button" className="pill-button" onClick={back}>
            <BackIcon />
            {t('letters.back')}
          </button>
          <h2 id="capsule-title" ref={heading} tabIndex={-1}>{t('capsule.title')}</h2>
        </div>
        {content}
      </div>
    </div>
  )
}

function LockedChest({ capsule }) {
  const { t, lang } = useI18n()
  return (
    <div className="capsule-chest">
      <span className="capsule-lock" aria-hidden="true">
        <LockIcon />
      </span>
      <p>
        <strong>{t('capsule.lockedUntil').replace('{date}', formatDay(capsule.opensOn, lang))}</strong>
      </p>
      <p>{capsule.itemCount === 0 ? t('capsule.empty') : countInside(t, capsule.itemCount)}</p>
      <p className="capsule-small">{t('capsule.nobodyCanPeek')}</p>
    </div>
  )
}

// "1 thing inside" / "3 things inside"
export function countInside(t, n) {
  return t(n === 1 ? 'capsule.inside.one' : 'capsule.inside.many').replace('{n}', n)
}

// "a letter", "3 photos" or "a letter and 3 photos", for the "are you sure?" step.
function whatGoesIn(t, hasLetter, photoCount) {
  const photos = photoCount === 0 ? null
    : t(photoCount === 1 ? 'capsule.whatPhotos.one' : 'capsule.whatPhotos.many').replace('{n}', photoCount)
  if (hasLetter && photos) return t('capsule.whatBoth').replace('{letter}', t('capsule.whatLetter')).replace('{photos}', photos)
  return hasLetter ? t('capsule.whatLetter') : photos
}

// 'YYYY-MM-DD' for tomorrow, the date box's lowest choice. (The server checks in Tbilisi time.)
function tomorrow() {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// The form and its "are you sure?" step are one component, so going back from the warning
// keeps everything that was written and chosen.
function FillCapsule({ code, confirming, onConfirm, onEdit, onSealed, onAlreadySealed }) {
  const { t, lang } = useI18n()
  const [body, setBody] = useState('')
  const [fromName, setFromName] = useState('')
  const [photos, setPhotos] = useState([]) // [{ shrunk: what shrinkPhoto() returns, preview: a blob: URL }]
  const [date, setDate] = useState('')
  // 'ready' | 'preparing' (shrinking photos) | 'saving' | 'unreadable' | 'tooMany' | 'failed'
  const [state, setState] = useState('ready')
  const [errorKey, setErrorKey] = useState(null) // when 'failed'
  const [progress, setProgress] = useState(null) // { done, total } while photos upload
  const fileInput = useRef(null)

  // Free the previews' memory when the page closes.
  const photosRef = useRef(photos)
  photosRef.current = photos
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), [])

  function pickPhotos() {
    fileInput.current.value = '' // so choosing the same photo again (after a problem) still counts
    fileInput.current.click()
  }

  async function onFilesChosen(event) {
    const room = MAX_PHOTOS - photos.length
    const files = [...event.target.files]
    if (files.length === 0) return
    setState('preparing')
    const added = []
    let unreadable = false
    // One at a time: shrinking several big photos at once can run a budget phone out of memory.
    for (const file of files.slice(0, room)) {
      try {
        const shrunk = await shrinkPhoto(file)
        added.push({ shrunk, preview: URL.createObjectURL(shrunk.blob) })
      } catch {
        unreadable = true
      }
    }
    setPhotos((current) => [...current, ...added])
    if (unreadable) setState('unreadable')
    else if (files.length > room) setState('tooMany')
    else setState('ready')
  }

  function removePhoto(photo) {
    URL.revokeObjectURL(photo.preview)
    setPhotos((current) => current.filter((p) => p !== photo))
  }

  function askToConfirm(event) {
    event.preventDefault()
    setState('ready')
    onConfirm()
  }

  async function lock() {
    setState('saving')
    setErrorKey(null)
    try {
      await sealCapsule(
        code,
        { date, fromName, body, photos: photos.map((p) => p.shrunk) },
        (done, total) => setProgress({ done, total }),
      )
      const itemCount = (body.trim() ? 1 : 0) + photos.length
      onSealed({ opensOn: date, itemCount, isOpen: false })
    } catch (error) {
      if (error.reason === 'sealed') onAlreadySealed()
      setErrorKey(error.reason ? `capsule.error.${error.reason}` : 'capsule.error.generic')
      setState('failed')
      setProgress(null)
    }
  }

  const hasLetter = body.trim() !== ''
  const day = date ? formatDay(date, lang) : ''

  if (confirming) {
    const saving = state === 'saving'
    return (
      <div className="letter-form">
        <div className="capsule-warning">
          <span className="capsule-lock" aria-hidden="true">
            <LockIcon />
          </span>
          <p>
            <strong>{t('capsule.confirmTitle').replace('{date}', day)}</strong>
          </p>
          <p>{t('capsule.confirmText').replace('{date}', day)}</p>
          <p>{t('capsule.confirmInside').replace('{what}', whatGoesIn(t, hasLetter, photos.length))}</p>
        </div>
        {state === 'failed' && (
          <p className="error" role="alert">
            {t(errorKey)}
          </p>
        )}
        <button type="button" className="big-button accent" onClick={lock} disabled={saving}>
          <LockIcon />
          {!saving ? t('capsule.confirmYes')
            : progress ? t('capsule.uploading').replace('{done}', progress.done).replace('{total}', progress.total)
            : t('capsule.locking')}
        </button>
        <button type="button" className="big-button soft" onClick={onEdit} disabled={saving}>
          {t('capsule.confirmBack')}
        </button>
      </div>
    )
  }

  const busy = state === 'preparing'
  return (
    <form className="letter-form" onSubmit={askToConfirm}>
      <p className="capsule-text">{t('capsule.fillText')}</p>

      <label className="field-label" htmlFor="capsule-body">
        {t('capsule.bodyLabel')}
      </label>
      <textarea
        id="capsule-body"
        className="text-field"
        rows={8}
        maxLength={5000}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      <label className="field-label" htmlFor="capsule-from">
        {t('letters.fromLabel')}
      </label>
      <input
        id="capsule-from"
        className="text-field"
        type="text"
        maxLength={60}
        autoComplete="name"
        placeholder={t('letters.fromPlaceholder')}
        value={fromName}
        onChange={(e) => setFromName(e.target.value)}
      />

      <p className="field-label">{t('capsule.photosLabel')}</p>
      {photos.length > 0 && (
        <ul className="capsule-photo-list">
          {photos.map((photo) => (
            <li key={photo.preview}>
              <img src={photo.preview} alt="" />
              <button type="button" className="capsule-photo-remove" onClick={() => removePhoto(photo)} aria-label={t('capsule.removePhoto')}>
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      {photos.length < MAX_PHOTOS && (
        <button type="button" className="big-button soft" onClick={pickPhotos} disabled={busy}>
          <AddPhotoIcon />
          {busy ? t('add.preparing') : t('capsule.addPhotos')}
        </button>
      )}
      <input ref={fileInput} type="file" accept="image/*" multiple hidden onChange={onFilesChosen} />
      {state === 'unreadable' && <p className="error" role="alert">{t('add.unreadable')}</p>}
      {state === 'tooMany' && <p className="error" role="alert">{t('capsule.photoLimit')}</p>}

      <label className="field-label" htmlFor="capsule-date">
        {t('capsule.dateLabel')}
      </label>
      <input
        id="capsule-date"
        className="text-field"
        type="date"
        required
        min={tomorrow()}
        value={date}
        onChange={(e) => setDate(e.target.value)}
      />

      <button type="submit" className="big-button accent" disabled={busy || !date || (!hasLetter && photos.length === 0)}>
        <LockIcon />
        {t('capsule.lock')}
      </button>
    </form>
  )
}

// The last step before deleting an opened capsule. It can't be undone, so it says what goes,
// and how to keep a copy first.
function DeleteCapsule({ code, onCancel, onDeleted }) {
  const { t } = useI18n()
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function remove() {
    setBusy(true)
    setFailed(false)
    try {
      await deleteOpenedCapsule(code)
      onDeleted()
    } catch {
      setBusy(false)
      setFailed(true)
    }
  }

  return (
    <div className="letter-form">
      <div className="capsule-warning">
        <p>
          <strong>{t('capsule.deleteTitle')}</strong>
        </p>
        <p>{t('capsule.deleteText')}</p>
        <p>{t('capsule.deleteKeepCopy').replace('{button}', t('export.button'))}</p>
      </div>
      {failed && <p className="error" role="alert">{t('capsule.deleteFailed')}</p>}
      <button type="button" className="big-button accent" onClick={remove} disabled={busy}>
        {busy ? t('capsule.deleting') : t('capsule.deleteYes')}
      </button>
      <button type="button" className="big-button soft" onClick={onCancel} disabled={busy}>
        {t('capsule.deleteNo')}
      </button>
    </div>
  )
}

// onDelete: the button to delete it and make a new one. Null for helpers, who can only read.
function OpenedCapsule({ code, capsule, onDelete }) {
  const { t, lang } = useI18n()
  const [items, setItems] = useState(null)
  const [failed, setFailed] = useState(false)

  function load() {
    setFailed(false)
    openCapsule(code).then(setItems, () => setFailed(true))
  }
  useEffect(load, [code])

  if (failed) {
    return (
      <div className="letters-empty" role="alert">
        <p>{t('capsule.loadFailed')}</p>
        <button type="button" className="big-button accent" onClick={load}>
          {t('tryAgain')}
        </button>
      </div>
    )
  }
  if (!items) return <p role="status">{t('capsule.opening')}</p>

  return (
    <>
      <p className="capsule-opened">{t('capsule.openedOn').replace('{date}', formatDay(capsule.opensOn, lang))}</p>
      {items.length === 0 && <p className="letters-empty">{t('capsule.openedEmpty')}</p>}
      {items.map((item, i) => (
        <article key={item.id} className="letter-paper">
          {/* Everything is sealed at once now, so the date only needs saying on the first one.
              Capsules from before (filled bit by bit) show it again whenever the day changes. */}
          {(i === 0 || formatDate(item.created_at, lang) !== formatDate(items[i - 1].created_at, lang)) && (
            <p className="letter-date">{t('capsule.sealedOn').replace('{date}', formatDate(item.created_at, lang))}</p>
          )}
          {item.photoUrl && (
            <img
              className="capsule-photo"
              src={item.photoUrl}
              width={item.photo_width ?? undefined}
              height={item.photo_height ?? undefined}
              alt=""
              loading="lazy"
            />
          )}
          {item.body && <p className="letter-body">{item.body}</p>}
          {item.from_name && <p className="letter-sign">{item.from_name}</p>}
        </article>
      ))}
      {onDelete && (
        <button type="button" className="big-button soft capsule-start-over" onClick={onDelete}>
          {t('capsule.startOver')}
        </button>
      )}
    </>
  )
}
