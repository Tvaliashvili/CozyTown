import { useState } from 'react'
import { useI18n } from '../i18n/i18n.jsx'
import { LockIcon } from './icons.jsx'

// "Is this the one?" - shown before the keeper locks the outside of their house.
// onConfirm must return a promise; while it runs the buttons are disabled so nobody taps twice.
export default function FinishDialog({ onConfirm, onCancel }) {
  const { t } = useI18n()
  const [saving, setSaving] = useState(false)
  const [failed, setFailed] = useState(false)

  async function confirm() {
    setSaving(true)
    setFailed(false)
    try {
      await onConfirm()
    } catch {
      setFailed(true)
      setSaving(false)
    }
  }

  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="finish-title">
        <div className="dialog-icon" aria-hidden="true">
          <LockIcon />
        </div>
        <h2 id="finish-title">{t('finish.title')}</h2>
        <p>{t('finish.text')}</p>
        <p className="dialog-note">{t('finish.price')}</p>
        {failed && (
          <p className="error" role="alert">
            {t('finish.error')}
          </p>
        )}
        <button className="big-button accent" onClick={confirm} disabled={saving}>
          {saving ? t('finish.saving') : t('finish.confirm')}
        </button>
        <button className="big-button soft" onClick={onCancel} disabled={saving}>
          {t('finish.cancel')}
        </button>
      </div>
    </div>
  )
}
