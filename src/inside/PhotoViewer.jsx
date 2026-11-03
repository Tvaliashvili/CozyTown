import { useState } from 'react'
import { takeDownPhoto } from '../data/inside.js'
import { useI18n } from '../i18n/i18n.jsx'
import { TrashIcon } from '../ui/icons.jsx'

// A photo from the wall, shown as big as the screen allows, with its caption.
// The keeper can also take it down (after a "are you sure?" step, since it deletes the photo).
export default function PhotoViewer({ photo, canTakeDown, onTakenDown, onClose }) {
  const { t } = useI18n()
  // 'looking' | 'confirming' | 'removing' | 'failed'
  const [state, setState] = useState('looking')

  async function takeDown() {
    setState('removing')
    try {
      await takeDownPhoto(photo)
      onTakenDown(photo)
    } catch {
      setState('failed')
    }
  }

  return (
    <div className="viewer" role="dialog" aria-modal="true" aria-label={photo.caption || t('room.photo')}>
      <img src={photo.url} alt={photo.caption || ''} />
      {photo.caption && <p className="viewer-caption">{photo.caption}</p>}

      {state === 'looking' ? (
        <div className="viewer-buttons">
          {canTakeDown && (
            <button type="button" className="big-button soft" onClick={() => setState('confirming')}>
              <TrashIcon />
              {t('room.takeDown')}
            </button>
          )}
          <button type="button" className="big-button" onClick={onClose}>
            {t('room.close')}
          </button>
        </div>
      ) : (
        <div className="viewer-confirm">
          <p>{t('room.takeDownSure')}</p>
          {state === 'failed' && (
            <p className="error" role="alert">
              {t('room.takeDownFailed')}
            </p>
          )}
          <div className="viewer-buttons">
            <button type="button" className="big-button accent" onClick={takeDown} disabled={state === 'removing'}>
              {state === 'removing' ? t('room.takingDown') : t('room.takeDownYes')}
            </button>
            <button type="button" className="big-button" onClick={() => setState('looking')} disabled={state === 'removing'}>
              {t('room.keepIt')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
