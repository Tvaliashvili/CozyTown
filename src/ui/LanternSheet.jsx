import { useEffect, useRef, useState } from 'react'
import { lightLantern } from '../data/houses.js'
import { useI18n } from '../i18n/i18n.jsx'
import { FlameIcon, LanternPicture } from './icons.jsx'

// "Light a lantern": a visitor says they stopped by. Slides up over the bottom of the street,
// so the garden (where the new lantern will appear) stays in view above it.
// count: how many lanterns are already lit. onLit: called once the database has the new one.
export default function LanternSheet({ code, count, onLit, onClose }) {
  const { t } = useI18n()
  const [fromName, setFromName] = useState('')
  const [message, setMessage] = useState('')
  // 'idle' | 'lighting' | 'failed' | 'tooMany'
  const [state, setState] = useState('idle')
  const heading = useRef(null)

  // Screen readers start reading at the title. We don't focus the name box on purpose:
  // that would pop up the phone keyboard and hide the street before anyone asked for it.
  useEffect(() => heading.current.focus(), [])

  async function light(event) {
    event.preventDefault()
    setState('lighting')
    try {
      await lightLantern(code, fromName, message)
      onLit()
    } catch (error) {
      setState(error.tooMany ? 'tooMany' : 'failed')
    }
  }

  let intro = t('lantern.textMany').replace('{n}', count)
  if (count === 0) intro = t('lantern.textNone')
  if (count === 1) intro = t('lantern.textOne')

  const lighting = state === 'lighting'

  return (
    <form className="lantern-sheet" onSubmit={light} aria-labelledby="lantern-title">
      <div className="lantern-sheet-top">
        <LanternPicture />
        <div>
          <h2 id="lantern-title" ref={heading} tabIndex={-1}>
            {t('lantern.title')}
          </h2>
          <p>{intro}</p>
        </div>
      </div>

      <label className="field-label" htmlFor="lantern-name">
        {t('lantern.nameLabel')}
      </label>
      <input
        id="lantern-name"
        className="text-field"
        type="text"
        maxLength={40}
        autoComplete="name"
        placeholder={t('lantern.namePlaceholder')}
        value={fromName}
        onChange={(e) => setFromName(e.target.value)}
        disabled={lighting}
      />

      <label className="field-label" htmlFor="lantern-message">
        {t('lantern.messageLabel')}
      </label>
      <textarea
        id="lantern-message"
        className="text-field"
        rows={2}
        maxLength={280}
        placeholder={t('lantern.messagePlaceholder')}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        disabled={lighting}
      />

      {state === 'failed' && (
        <p className="error" role="alert">
          {t('lantern.failed')}
        </p>
      )}
      {state === 'tooMany' && (
        <p className="error" role="alert">
          {t('lantern.tooMany')}
        </p>
      )}

      <button type="submit" className="big-button gold" disabled={lighting}>
        <FlameIcon />
        {lighting ? t('lantern.lighting') : t('lantern.lightMine')}
      </button>
      <button type="button" className="big-button soft" onClick={onClose} disabled={lighting}>
        {t('lantern.notNow')}
      </button>
      <p className="lantern-note">{t('lantern.note')}</p>
    </form>
  )
}
