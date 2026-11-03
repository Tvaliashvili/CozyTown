import { useEffect, useRef, useState } from 'react'
import { createInvite, inviteUrl, loadHelpers, removeHelper } from '../data/helpers.js'
import { groupGiftCode } from '../data/links.js'
import { useI18n } from '../i18n/i18n.jsx'
import { BackIcon, PlusIcon, ShareIcon } from '../ui/icons.jsx'

// "Family helpers": a full-screen page over the room, for the keeper only.
// Shows who helps decorate, lets the keeper remove someone, and makes invite links.
export default function Helpers({ code, onClose }) {
  const { t } = useI18n()
  const [helpers, setHelpers] = useState(null) // null = still loading
  const [failed, setFailed] = useState(false)
  const [invite, setInvite] = useState(null) // the invite code just made
  // 'idle' | 'making' | 'failed' | 'tooMany'
  const [inviteState, setInviteState] = useState('idle')
  // A screen reader starts reading from the title when the page opens.
  const heading = useRef(null)
  useEffect(() => heading.current?.focus(), [])

  function load() {
    setFailed(false)
    loadHelpers(code).then(setHelpers, () => setFailed(true))
  }
  useEffect(load, [code])

  async function makeInvite() {
    setInviteState('making')
    try {
      setInvite(await createInvite(code))
      setInviteState('idle')
    } catch (error) {
      setInviteState(error.tooMany ? 'tooMany' : 'failed')
    }
  }

  return (
    <div className="letters" role="dialog" aria-modal="true" aria-labelledby="helpers-title">
      <div className="letters-inner">
        <div className="letters-head">
          <button type="button" className="pill-button" onClick={onClose}>
            <BackIcon />
            {t('letters.back')}
          </button>
          <h2 id="helpers-title" ref={heading} tabIndex={-1}>{t('helpers.title')}</h2>
        </div>

        <p className="capsule-text">{t('helpers.text')}</p>

        {invite ? (
          <InviteBox inviteCode={invite} />
        ) : (
          <button type="button" className="big-button accent" onClick={makeInvite} disabled={inviteState === 'making'}>
            <PlusIcon />
            {inviteState === 'making' ? t('helpers.making') : t('helpers.invite')}
          </button>
        )}
        {inviteState === 'failed' && <p className="error" role="alert">{t('helpers.inviteFailed')}</p>}
        {inviteState === 'tooMany' && <p className="error" role="alert">{t('helpers.tooMany')}</p>}

        <h3 className="helpers-heading">{t('helpers.listTitle')}</h3>
        {failed && (
          <div className="letters-empty" role="alert">
            <p>{t('helpers.loadFailed')}</p>
            <button type="button" className="big-button soft" onClick={load}>
              {t('tryAgain')}
            </button>
          </div>
        )}
        {!failed && helpers === null && <p role="status">{t('helpers.loading')}</p>}
        {helpers?.length === 0 && <p className="capsule-small">{t('helpers.none')}</p>}
        {helpers?.length > 0 && (
          <ul className="helper-list">
            {helpers.map((helper) => (
              <HelperRow
                key={helper.user_id}
                code={code}
                helper={helper}
                onRemoved={() => setHelpers((current) => current.filter((h) => h.user_id !== helper.user_id))}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

// The new invite: a link to send, plus the code itself for typing by hand.
function InviteBox({ inviteCode }) {
  const { t } = useI18n()
  const url = inviteUrl(inviteCode)
  const [copied, setCopied] = useState(false)

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: t('helpers.shareTitle'), url })
      } catch {
        // Closed the share menu without picking anything. Nothing to do.
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
    } catch {
      window.prompt(t('room.copyThis'), url)
    }
  }

  return (
    <div className="invite-box">
      <p>
        <strong>{t('helpers.sendThis')}</strong>
      </p>
      <input className="text-field invite-link" type="text" readOnly value={url} onFocus={(e) => e.target.select()} />
      <button type="button" className="big-button accent" onClick={share}>
        <ShareIcon />
        <span role="status">{copied ? t('room.copied') : t('helpers.send')}</span>
      </button>
      <p className="capsule-small">
        {t('helpers.orType')} <strong className="invite-code">{groupGiftCode(inviteCode)}</strong>
      </p>
      <p className="capsule-small">{t('helpers.onceOnly')}</p>
    </div>
  )
}

function HelperRow({ code, helper, onRemoved }) {
  const { t } = useI18n()
  // 'idle' | 'confirming' | 'removing' | 'failed'
  const [state, setState] = useState('idle')

  async function remove() {
    setState('removing')
    try {
      await removeHelper(code, helper)
      onRemoved()
    } catch {
      setState('failed')
    }
  }

  return (
    <li className="helper-row">
      <span className="helper-email">{helper.email}</span>
      {state === 'idle' ? (
        <button type="button" className="link-button" onClick={() => setState('confirming')}>
          {t('helpers.remove')}
        </button>
      ) : (
        <div className="letters-confirm">
          <p>{t('helpers.removeSure')}</p>
          {state === 'failed' && <p className="error" role="alert">{t('letters.deleteFailed')}</p>}
          <button type="button" className="big-button accent" onClick={remove} disabled={state === 'removing'}>
            {t('helpers.removeYes')}
          </button>
          <button type="button" className="big-button soft" onClick={() => setState('idle')} disabled={state === 'removing'}>
            {t('letters.keep')}
          </button>
        </div>
      )}
    </li>
  )
}
