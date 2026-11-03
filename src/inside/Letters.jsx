import { useEffect, useRef, useState } from 'react'
import { deleteLetter, sendLetter } from '../data/inside.js'
import { useI18n } from '../i18n/i18n.jsx'
import { formatDate } from '../lib/formatDate.js'
import { useBackState } from '../lib/useBackState.js'
import { BackIcon, PenIcon, TrashIcon } from '../ui/icons.jsx'

// The mailbox: a full-screen page over the room with the house's letters. Keeper only.
// letters lives in Room (it also shows how many there are); onChange gives it the new list.
// Three views: the list, one letter open for reading, and writing a new one.
// onlyOwn: the person is a helper, so the database only gives them the letters they wrote.
export default function Letters({ code, letters, failed, onRetry, onChange, onClose, onlyOwn = false }) {
  const { t } = useI18n()
  // The phone's Back button goes from a letter back to the list, like the Back button on screen.
  const [reading, setReading] = useBackState(null)
  const [writing, setWriting] = useBackState(false)
  // A screen reader starts reading from the title when the page opens or changes view.
  const heading = useRef(null)
  useEffect(() => heading.current?.focus(), [writing, reading])

  function back() {
    if (reading || writing) {
      setReading(null)
      setWriting(false)
    } else {
      onClose()
    }
  }

  function onSent(letter) {
    onChange([letter, ...letters])
    setWriting(false)
  }

  function onDeleted(letter) {
    onChange(letters.filter((l) => l.id !== letter.id))
    setReading(null)
  }

  let content
  if (writing) {
    content = <WriteLetter code={code} onSent={onSent} onCancel={() => setWriting(false)} />
  } else if (reading) {
    content = <ReadLetter letter={reading} onDeleted={onDeleted} />
  } else if (failed) {
    content = (
      <div className="letters-empty" role="alert">
        <p>{t('letters.loadFailed')}</p>
        <button type="button" className="big-button accent" onClick={onRetry}>
          {t('tryAgain')}
        </button>
      </div>
    )
  } else if (letters === null) {
    content = <p role="status">{t('letters.loading')}</p>
  } else {
    content = (
      <>
        <button type="button" className="big-button accent" onClick={() => setWriting(true)}>
          <PenIcon />
          {t('letters.write')}
        </button>
        {onlyOwn && <p className="letters-empty">{t('letters.onlyOwn')}</p>}
        {letters.length === 0 && !onlyOwn && <p className="letters-empty">{t('letters.empty')}</p>}
        {letters.map((letter) => (
          <button key={letter.id} type="button" className="letter-item" onClick={() => setReading(letter)}>
            <strong>{letter.from_name ? `${t('letters.from')} ${letter.from_name}` : t('letters.aLetter')}</strong>
            <span className="letter-date">
              <LetterDate letter={letter} />
            </span>
            <span className="letter-start">{letter.body}</span>
          </button>
        ))}
      </>
    )
  }

  return (
    <div className="letters" role="dialog" aria-modal="true" aria-labelledby="letters-title">
      <div className="letters-inner">
        <div className="letters-head">
          <button type="button" className="pill-button" onClick={back}>
            <BackIcon />
            {t('letters.back')}
          </button>
          <h2 id="letters-title" ref={heading} tabIndex={-1}>{writing ? t('letters.write') : t('room.lettersTitle')}</h2>
        </div>
        {content}
      </div>
    </div>
  )
}

function ReadLetter({ letter, onDeleted }) {
  const { t } = useI18n()
  // 'reading' | 'confirming' | 'deleting' | 'failed'
  const [state, setState] = useState('reading')

  async function remove() {
    setState('deleting')
    try {
      await deleteLetter(letter)
      onDeleted(letter)
    } catch {
      setState('failed')
    }
  }

  return (
    <>
      <article className="letter-paper">
        <p className="letter-date">
          <LetterDate letter={letter} />
        </p>
        <p className="letter-body">{letter.body}</p>
        {letter.from_name && <p className="letter-sign">{letter.from_name}</p>}
      </article>

      {state === 'reading' ? (
        <button type="button" className="link-button" onClick={() => setState('confirming')}>
          <TrashIcon />
          {t('letters.delete')}
        </button>
      ) : (
        <div className="letters-confirm">
          <p>{t('letters.deleteSure')}</p>
          {state === 'failed' && (
            <p className="error" role="alert">
              {t('letters.deleteFailed')}
            </p>
          )}
          <button type="button" className="big-button accent" onClick={remove} disabled={state === 'deleting'}>
            {t('letters.deleteYes')}
          </button>
          <button type="button" className="big-button soft" onClick={() => setState('reading')} disabled={state === 'deleting'}>
            {t('letters.keep')}
          </button>
        </div>
      )}
    </>
  )
}

function WriteLetter({ code, onSent, onCancel }) {
  const { t } = useI18n()
  const [fromName, setFromName] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [failed, setFailed] = useState(false)

  async function send(event) {
    event.preventDefault()
    setSending(true)
    setFailed(false)
    try {
      onSent(await sendLetter(code, fromName, body))
    } catch {
      setFailed(true)
      setSending(false)
    }
  }

  return (
    <form className="letter-form" onSubmit={send}>
      <label className="field-label" htmlFor="letter-body">
        {t('letters.bodyLabel')}
      </label>
      <textarea
        id="letter-body"
        className="text-field"
        rows={9}
        maxLength={5000}
        required
        value={body}
        onChange={(e) => setBody(e.target.value)}
        disabled={sending}
      />
      <label className="field-label" htmlFor="letter-from">
        {t('letters.fromLabel')}
      </label>
      <input
        id="letter-from"
        className="text-field"
        type="text"
        maxLength={60}
        autoComplete="name"
        placeholder={t('letters.fromPlaceholder')}
        value={fromName}
        onChange={(e) => setFromName(e.target.value)}
        disabled={sending}
      />
      {failed && (
        <p className="error" role="alert">
          {t('letters.sendFailed')}
        </p>
      )}
      <button type="submit" className="big-button accent" disabled={sending || !body.trim()}>
        {sending ? t('letters.sending') : t('letters.send')}
      </button>
      <button type="button" className="big-button soft" onClick={onCancel} disabled={sending}>
        {t('add.cancel')}
      </button>
    </form>
  )
}

function LetterDate({ letter }) {
  const { lang } = useI18n()
  return formatDate(letter.created_at, lang)
}
