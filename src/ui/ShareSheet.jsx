import { useEffect, useRef, useState } from 'react'
import { houseUrl } from '../data/links.js'
import { useI18n } from '../i18n/i18n.jsx'
import { Link } from '../router.jsx'
import QrCode from './QrCode.jsx'

// "Share your house", for the keeper: the private link, its QR code, and the printable card.
// Slides up like the lantern screens, so the house stays in view above it.
export default function ShareSheet({ code, onClose }) {
  const { t } = useI18n()
  const url = houseUrl(code)
  // 'idle' | 'copied' | 'failed'
  const [copyState, setCopyState] = useState('idle')
  const heading = useRef(null)
  const linkBox = useRef(null)
  // Phones have their own share menu (WhatsApp, Messenger…). Most computers don't.
  const canShare = typeof navigator.share === 'function'

  // Screen readers start reading at the title.
  useEffect(() => heading.current.focus(), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopyState('copied')
    } catch {
      // Some browsers block copying. Select the link instead, so a long press copies it.
      linkBox.current.select()
      setCopyState('failed')
    }
  }

  function share() {
    // Closing the share menu without picking anything counts as an error; that's fine.
    navigator.share({ title: t('appName'), url }).catch(() => {})
  }

  return (
    <section className="lantern-sheet share-sheet" aria-labelledby="share-title">
      <h2 id="share-title" ref={heading} tabIndex={-1}>
        {t('share.title')}
      </h2>
      <p className="share-text">{t('share.text')}</p>

      <div className="share-link-row">
        <QrCode text={url} className="share-qr" />
        <input
          ref={linkBox}
          className="text-field share-link"
          type="text"
          readOnly
          value={url}
          aria-label={t('share.linkLabel')}
          onFocus={(e) => e.target.select()}
        />
      </div>
      {copyState === 'failed' && (
        <p className="error" role="alert">
          {t('share.copyFailed')}
        </p>
      )}

      {canShare && (
        <button type="button" className="big-button accent" onClick={share}>
          {t('share.share')}
        </button>
      )}
      <button type="button" className={canShare ? 'big-button white' : 'big-button accent'} onClick={copy}>
        <span role="status">{copyState === 'copied' ? t('share.copied') : t('share.copy')}</span>
      </button>
      <Link to={`/h/${code}/card`} className="big-button white">
        {t('share.card')}
      </Link>
      <button type="button" className="big-button soft" onClick={onClose}>
        {t('close')}
      </button>
    </section>
  )
}
