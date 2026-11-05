import { useEffect, useState } from 'react'
import { shrinkPhoto } from '../lib/shrinkPhoto.js'
import { hangPhoto } from '../data/inside.js'
import { useI18n } from '../i18n/i18n.jsx'

// Several photos chosen at once: adds them one after another, without asking for words for each.
// One at a time on purpose, because shrinking many big photos together would choke a budget phone.
// files: the photos to add. noRoom: how many more were chosen than fit in the house.
// freeFrames: the empty frames, filled first; the rest go in the album.
// onAdded: called for each photo as it arrives, so stopping halfway keeps what's already in.
export default function AddMany({ code, files, noRoom, freeFrames, onAdded, onClose }) {
  const { t } = useI18n()
  const [current, setCurrent] = useState(1)
  const [failed, setFailed] = useState(0)
  const [finished, setFinished] = useState(false)

  useEffect(() => {
    // Stop, or the phone's Back button, closes this box, which ends the loop after the photo it's on.
    let stopped = false
    async function addAll() {
      const frames = [...freeFrames]
      for (let i = 0; i < files.length && !stopped; i++) {
        setCurrent(i + 1)
        try {
          const shrunk = await shrinkPhoto(files[i])
          if (stopped) return
          // If this one fails, its frame is skipped, in case someone else just filled it. The next goes on.
          const photo = await hangPhoto(code, shrunk, frames.shift() ?? null, '')
          onAdded(photo) // even if stopped meanwhile: it is in the house now
        } catch {
          setFailed((count) => count + 1)
        }
      }
      if (!stopped) setFinished(true)
    }
    addAll()
    return () => {
      stopped = true
    }
  }, [])

  // All went well: nothing to read, so go straight back to the room or album.
  useEffect(() => {
    if (finished && failed === 0 && noRoom === 0) onClose()
  }, [finished])

  return (
    <div className="dialog-backdrop">
      <div className="dialog add-photo" role="dialog" aria-modal="true" aria-labelledby="add-many-title">
        <h2 id="add-many-title">{t('album.title')}</h2>

        {finished ? (
          <>
            <p role="status">{t('add.manyDone').replace('{n}', files.length - failed)}</p>
            {noRoom > 0 && (
              <p className="error" role="alert">{t('add.manyNoRoom').replace('{n}', noRoom)}</p>
            )}
            {failed > 0 && (
              <p className="error" role="alert">{t('add.manyFailed').replace('{n}', failed)}</p>
            )}
            <button type="button" className="big-button accent" onClick={onClose}>
              {t('add.manyOk')}
            </button>
          </>
        ) : (
          <>
            <p role="status">{t('add.manyProgress').replace('{n}', current).replace('{total}', files.length)}</p>
            <progress className="add-many-bar" max={files.length} value={current - 1} />
            <button type="button" className="big-button soft" onClick={onClose}>
              {t('add.manyStop')}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
