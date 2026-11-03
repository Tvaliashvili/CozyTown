import { useEffect, useState } from 'react'
import { shrinkPhoto } from '../lib/shrinkPhoto.js'
import { hangPhoto } from '../data/inside.js'
import { useI18n } from '../i18n/i18n.jsx'

// "Hang this photo?" - shrinks the chosen photo, shows it, and asks for a few optional words.
// slot = the frame it will hang in.
export default function AddPhoto({ code, file, slot, onHung, onCancel }) {
  const { t } = useI18n()
  // 'preparing' | 'ready' | 'saving' | 'failed' (upload didn't work) | 'unreadable' (not a photo we can open)
  const [state, setState] = useState('preparing')
  const [shrunk, setShrunk] = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')

  useEffect(() => {
    let cancelled = false
    let previewUrl = null
    shrinkPhoto(file).then(
      (result) => {
        if (cancelled) return
        previewUrl = URL.createObjectURL(result.blob)
        setShrunk(result)
        setPreview(previewUrl)
        setState('ready')
      },
      () => !cancelled && setState('unreadable'),
    )
    return () => {
      cancelled = true
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [file])

  async function hang(event) {
    event.preventDefault()
    setState('saving')
    try {
      onHung(await hangPhoto(code, shrunk, slot, caption))
    } catch {
      setState('failed')
    }
  }

  const busy = state === 'preparing' || state === 'saving'

  return (
    <div className="dialog-backdrop">
      <form className="dialog add-photo" role="dialog" aria-modal="true" aria-labelledby="add-photo-title" onSubmit={hang}>
        <h2 id="add-photo-title">{t('add.title')}</h2>

        {state === 'preparing' && <p role="status">{t('add.preparing')}</p>}
        {preview && <img className="add-photo-preview" src={preview} alt="" />}

        {state === 'unreadable' ? (
          <p className="error" role="alert">
            {t('add.unreadable')}
          </p>
        ) : (
          <>
            <label className="field-label" htmlFor="photo-caption">
              {t('add.caption')}
            </label>
            <input
              id="photo-caption"
              className="text-field"
              type="text"
              maxLength={200}
              placeholder={t('add.captionPlaceholder')}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              disabled={busy}
            />
            {state === 'failed' && (
              <p className="error" role="alert">
                {t('add.failed')}
              </p>
            )}
            <button type="submit" className="big-button accent" disabled={busy}>
              {state === 'saving' ? t('add.saving') : t('add.hang')}
            </button>
          </>
        )}

        <button type="button" className="big-button soft" onClick={onCancel} disabled={state === 'saving'}>
          {t('add.cancel')}
        </button>
      </form>
    </div>
  )
}
