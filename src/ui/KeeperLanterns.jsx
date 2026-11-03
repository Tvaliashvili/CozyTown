import { useEffect, useRef, useState } from 'react'
import { isNewLantern, KEEPER_LANTERN_LIMIT, removeLantern } from '../data/houses.js'
import { useI18n } from '../i18n/i18n.jsx'
import { formatDate } from '../lib/formatDate.js'
import { LanternPicture, TrashIcon } from './icons.jsx'

// The keeper's lanterns: who stopped by and what they wrote. Slides up like the visitor's
// "Light a lantern" screen, so the glowing garden stays in view above it.
//
// list: { lanterns, seenUntil } once loaded, null while loading. failed: it didn't load.
// count: how many lanterns there are in total (the list holds the newest 100 at most).
// onRemoved: called once the database has removed one.
export default function KeeperLanterns({ list, failed, count, onRetry, onRemoved, onClose }) {
  const { t } = useI18n()
  const heading = useRef(null)

  // Screen readers start reading at the title.
  useEffect(() => heading.current.focus(), [])

  let intro = t('keeperLantern.textMany').replace('{n}', count)
  if (count === 1) intro = t('keeperLantern.textOne')

  let content
  if (failed) {
    content = (
      <div className="keeper-lanterns-message" role="alert">
        <p>{t('keeperLantern.failed')}</p>
        <button type="button" className="big-button accent" onClick={onRetry}>
          {t('tryAgain')}
        </button>
      </div>
    )
  } else if (list === null) {
    content = (
      <p className="keeper-lanterns-message" role="status">
        {t('keeperLantern.loading')}
      </p>
    )
  } else {
    content = (
      <>
        <ul className="keeper-lantern-list">
          {list.lanterns.map((lantern) => (
            <LanternItem
              key={lantern.id}
              lantern={lantern}
              isNew={isNewLantern(lantern, list.seenUntil)}
              onRemoved={onRemoved}
            />
          ))}
        </ul>
        {count > list.lanterns.length && (
          <p className="lantern-note">{t('keeperLantern.onlyNewest').replace('{n}', KEEPER_LANTERN_LIMIT)}</p>
        )}
      </>
    )
  }

  return (
    <section className="lantern-sheet keeper" aria-labelledby="keeper-lantern-title">
      <div className="lantern-sheet-top">
        <LanternPicture />
        <div>
          <h2 id="keeper-lantern-title" ref={heading} tabIndex={-1}>
            {t('keeperLantern.title')}
          </h2>
          <p>{intro}</p>
        </div>
      </div>
      {content}
      <button type="button" className="big-button soft" onClick={onClose}>
        {t('close')}
      </button>
    </section>
  )
}

// One lantern: name, date and words. "Remove" asks first, right there in the card.
function LanternItem({ lantern, isNew, onRemoved }) {
  const { t, lang } = useI18n()
  // 'showing' | 'confirming' | 'removing' | 'failed'
  const [state, setState] = useState('showing')

  async function remove() {
    setState('removing')
    try {
      await removeLantern(lantern)
      onRemoved(lantern)
    } catch {
      setState('failed')
    }
  }

  if (state !== 'showing') {
    const removing = state === 'removing'
    return (
      <li className="keeper-lantern confirming">
        <p className="keeper-lantern-sure">{t('keeperLantern.removeSure')}</p>
        {state === 'failed' && (
          <p className="error" role="alert">
            {t('keeperLantern.removeFailed')}
          </p>
        )}
        <button type="button" className="big-button accent" onClick={remove} disabled={removing}>
          {t('keeperLantern.removeYes')}
        </button>
        <button type="button" className="big-button soft" onClick={() => setState('showing')} disabled={removing}>
          {t('keeperLantern.keep')}
        </button>
      </li>
    )
  }

  return (
    <li className="keeper-lantern">
      <div className="keeper-lantern-head">
        <strong>{lantern.from_name || t('keeperLantern.someone')}</strong>
        {isNew && <span className="new-chip">{t('keeperLantern.newTag')}</span>}
      </div>
      <span className="keeper-lantern-date">{formatDate(lantern.created_at, lang)}</span>
      {lantern.message && <p className="keeper-lantern-words">{lantern.message}</p>}
      <button type="button" className="link-button" onClick={() => setState('confirming')}>
        <TrashIcon />
        {t('keeperLantern.remove')}
      </button>
    </li>
  )
}
