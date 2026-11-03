import { useEffect, useRef, useState } from 'react'
import { addToCapsule, openCapsule, setCapsuleDate } from '../data/capsule.js'
import { useI18n } from '../i18n/i18n.jsx'
import { formatDate, formatDay } from '../lib/formatDate.js'
import { shrinkPhoto } from '../lib/shrinkPhoto.js'
import { AddPhotoIcon, BackIcon, LockIcon, PenIcon } from '../ui/icons.jsx'

// The time capsule: a full-screen page over the room, like the mailbox. For people who decorate.
// capsule lives in Room (its card shows the date): null = no chest yet, otherwise
// { opensOn, itemCount, isOpen }. onChange gives Room the new state.
//
//   No chest yet → the keeper picks the day it opens.
//   Locked       → put letters and photos in; the keeper can move the day later (never earlier).
//   Open         → read everything inside.
export default function Capsule({ code, capsule, isKeeper, onChange, onClose }) {
  const { t, lang } = useI18n()
  // 'main' | 'add' | 'date'
  const [view, setView] = useState('main')
  const [sealed, setSealed] = useState(false) // just put something in

  function back() {
    if (view !== 'main') setView('main')
    else onClose()
  }

  let content
  if (capsule?.isOpen) {
    content = <OpenedCapsule code={code} capsule={capsule} />
  } else if (!capsule || view === 'date') {
    content = isKeeper ? (
      <ChooseDate
        code={code}
        capsule={capsule}
        onChosen={(opensOn) => {
          onChange({ itemCount: 0, ...capsule, opensOn, isOpen: false })
          setView('main')
        }}
        onCancel={capsule ? () => setView('main') : null}
      />
    ) : (
      <p className="capsule-text">{t('capsule.noDateHelper')}</p>
    )
  } else if (view === 'add') {
    content = (
      <AddToCapsule
        code={code}
        capsule={capsule}
        onAdded={() => {
          onChange({ ...capsule, itemCount: capsule.itemCount + 1 })
          setSealed(true)
          setView('main')
        }}
        onCancel={() => setView('main')}
      />
    )
  } else {
    content = (
      <>
        <LockedChest capsule={capsule} />
        {sealed && (
          <p className="capsule-sealed" role="status">
            {t('capsule.sealed').replace('{date}', formatDay(capsule.opensOn, lang))}
          </p>
        )}
        <button type="button" className="big-button accent" onClick={() => { setSealed(false); setView('add') }}>
          <PenIcon />
          {t('capsule.add')}
        </button>
        {isKeeper && (
          <button type="button" className="link-button quiet" onClick={() => setView('date')}>
            {t('capsule.moveLater')}
          </button>
        )}
      </>
    )
  }

  return (
    <div className="letters" role="dialog" aria-modal="true" aria-labelledby="capsule-title">
      <div className="letters-inner">
        <div className="letters-head">
          <button type="button" className="pill-button" onClick={back}>
            <BackIcon />
            {t('letters.back')}
          </button>
          <h2 id="capsule-title">{t('capsule.title')}</h2>
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

// 'YYYY-MM-DD' for the day after the given one (or after today), for the date box's lowest choice.
function dayAfter(day) {
  const date = day ? new Date(`${day}T00:00:00Z`) : new Date()
  date.setUTCDate(date.getUTCDate() + 1)
  return date.toISOString().slice(0, 10)
}

function ChooseDate({ code, capsule, onChosen, onCancel }) {
  const { t } = useI18n()
  const [date, setDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorKey, setErrorKey] = useState(null)

  async function save(event) {
    event.preventDefault()
    setSaving(true)
    setErrorKey(null)
    try {
      await setCapsuleDate(code, date)
      onChosen(date)
    } catch (error) {
      setErrorKey(error.reason ? `capsule.error.${error.reason}` : 'capsule.error.generic')
      setSaving(false)
    }
  }

  return (
    <form className="letter-form" onSubmit={save}>
      <p className="capsule-text">{capsule ? t('capsule.moveText') : t('capsule.chooseText')}</p>
      <label className="field-label" htmlFor="capsule-date">
        {t('capsule.dateLabel')}
      </label>
      <input
        id="capsule-date"
        className="text-field"
        type="date"
        required
        min={dayAfter(capsule?.opensOn)}
        value={date}
        onChange={(e) => setDate(e.target.value)}
        disabled={saving}
      />
      <p className="capsule-small">{t('capsule.dateRule')}</p>
      {errorKey && (
        <p className="error" role="alert">
          {t(errorKey)}
        </p>
      )}
      <button type="submit" className="big-button accent" disabled={saving || !date}>
        <LockIcon />
        {saving ? t('capsule.saving') : t('capsule.setDate')}
      </button>
      {onCancel && (
        <button type="button" className="big-button soft" onClick={onCancel} disabled={saving}>
          {t('add.cancel')}
        </button>
      )}
    </form>
  )
}

function AddToCapsule({ code, capsule, onAdded, onCancel }) {
  const { t, lang } = useI18n()
  const [body, setBody] = useState('')
  const [fromName, setFromName] = useState('')
  const [photo, setPhoto] = useState(null) // what shrinkPhoto() returns
  const [preview, setPreview] = useState(null)
  // 'ready' | 'preparing' (shrinking the photo) | 'saving' | 'failed' | 'unreadable'
  const [state, setState] = useState('ready')
  const fileInput = useRef(null)

  // Free the preview's memory when it changes or the form closes.
  useEffect(() => () => preview && URL.revokeObjectURL(preview), [preview])

  async function onFileChosen(event) {
    const file = event.target.files[0]
    if (!file) return
    setState('preparing')
    try {
      const shrunk = await shrinkPhoto(file)
      setPhoto(shrunk)
      setPreview(URL.createObjectURL(shrunk.blob))
      setState('ready')
    } catch {
      setState('unreadable')
    }
  }

  async function seal(event) {
    event.preventDefault()
    setState('saving')
    try {
      await addToCapsule(code, { fromName, body, photo })
      onAdded()
    } catch {
      setState('failed')
    }
  }

  const busy = state === 'saving' || state === 'preparing'
  return (
    <form className="letter-form" onSubmit={seal}>
      <p className="capsule-text">{t('capsule.addText').replace('{date}', formatDay(capsule.opensOn, lang))}</p>
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
        disabled={busy}
      />

      {preview ? (
        <div className="capsule-photo-preview">
          <img src={preview} alt="" />
          <button type="button" className="link-button" onClick={() => { setPhoto(null); setPreview(null) }} disabled={busy}>
            {t('capsule.removePhoto')}
          </button>
        </div>
      ) : (
        <button type="button" className="big-button soft" onClick={() => fileInput.current.click()} disabled={busy}>
          <AddPhotoIcon />
          {state === 'preparing' ? t('add.preparing') : t('capsule.addPhoto')}
        </button>
      )}
      <input ref={fileInput} type="file" accept="image/*" hidden onChange={onFileChosen} />

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
        disabled={busy}
      />

      {state === 'unreadable' && <p className="error" role="alert">{t('add.unreadable')}</p>}
      {state === 'failed' && <p className="error" role="alert">{t('capsule.addFailed')}</p>}
      <p className="capsule-small">{t('capsule.noTakingBack')}</p>
      <button type="submit" className="big-button accent" disabled={busy || (!body.trim() && !photo)}>
        <LockIcon />
        {state === 'saving' ? t('capsule.sealing') : t('capsule.seal')}
      </button>
      <button type="button" className="big-button soft" onClick={onCancel} disabled={state === 'saving'}>
        {t('add.cancel')}
      </button>
    </form>
  )
}

function OpenedCapsule({ code, capsule }) {
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
      {items.map((item) => (
        <article key={item.id} className="letter-paper">
          <p className="letter-date">{t('capsule.sealedOn').replace('{date}', formatDate(item.created_at, lang))}</p>
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
    </>
  )
}
