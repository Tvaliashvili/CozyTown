import { useEffect, useRef, useState } from 'react'
import { PHOTO_LIMIT } from '../data/inside.js'
import { useI18n } from '../i18n/i18n.jsx'
import { AddPhotoIcon, BackIcon } from '../ui/icons.jsx'

// The photo album: a full-screen page over the room with every photo in the house, framed ones first.
// Keeper and helpers can add photos here. Visitors just look.
export default function Album({ photos, canDecorate, onAdd, onOpenPhoto, onClose }) {
  const { t } = useI18n()
  const full = photos.length >= PHOTO_LIMIT
  // A screen reader starts reading from the title when the page opens.
  const heading = useRef(null)
  useEffect(() => heading.current?.focus(), [])

  return (
    <div className="letters" role="dialog" aria-modal="true" aria-labelledby="album-title">
      <div className="letters-inner">
        <div className="letters-head">
          <button type="button" className="pill-button" onClick={onClose}>
            <BackIcon />
            {t('letters.back')}
          </button>
          <h2 id="album-title" ref={heading} tabIndex={-1}>{t('album.title')}</h2>
        </div>

        {canDecorate && (
          <>
            <p className="capsule-small">
              {t('album.count').replace('{n}', photos.length).replace('{max}', PHOTO_LIMIT)}
            </p>
            <button type="button" className="big-button accent" onClick={onAdd} disabled={full}>
              <AddPhotoIcon />
              {full ? t('album.full') : t('room.addPhoto')}
            </button>
            {full && <p className="room-note">{t('album.fullHint')}</p>}
          </>
        )}

        {photos.length === 0 && <p className="letters-empty">{t('album.empty')}</p>}

        <ul className="album-grid">
          {photos.map((photo) => (
            <AlbumPhoto key={photo.id} photo={photo} label={photo.caption || t('room.photo')} onOpen={() => onOpenPhoto(photo)} />
          ))}
        </ul>
      </div>
    </div>
  )
}

// One photo in the grid. It downloads its small copy only when it comes near the screen:
// someone who opens a full album and looks at the first few shouldn't pay for all 30.
// (The browser's own loading="lazy" starts far too early for this, over a thousand pixels ahead.)
function AlbumPhoto({ photo, label, onOpen }) {
  const button = useRef(null)
  const [nearScreen, setNearScreen] = useState(false)

  useEffect(() => {
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNearScreen(true)
          watcher.disconnect()
        }
      },
      { root: button.current.closest('.letters'), rootMargin: '150px' },
    )
    watcher.observe(button.current)
    return () => watcher.disconnect()
  }, [])

  return (
    <li>
      <button ref={button} type="button" className="album-photo" onClick={onOpen} aria-label={label}>
        {nearScreen && <img src={photo.smallUrl} alt="" decoding="async" />}
      </button>
    </li>
  )
}
