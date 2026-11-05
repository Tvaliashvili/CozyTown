import { useEffect, useRef, useState } from 'react'
import RoomArt, { RoomBackdrop } from './RoomArt.jsx'
import { ALBUM_SPOT, FRAMES, STRETCH_WIDTH, framesToShow, stretchesFor } from './frames.js'
import { useNearScreen } from '../lib/useNearScreen.js'
import { useI18n } from '../i18n/i18n.jsx'
import { BackIcon, ForwardIcon, PlusIcon } from '../ui/icons.jsx'

// How much of the screen one press of an arrow moves, so the last frame you saw stays in view.
const ARROW_STEP = 0.8

// The part of the wall you can really see. On wide screens the sheet floats over the right side (room.css).
function visibleWidth(wall) {
  return wall.clientWidth - parseFloat(getComputedStyle(wall).paddingRight)
}

// People who asked their phone for less motion get a jump instead of a slide.
function scrollMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
}

// The wall of the room: the drawing, the frames and the album on its shelf. It is as long as its photos need,
// and scrolls sideways when that's more than the screen. Swiping is the phone's own scrolling; the arrows are
// for people who wouldn't think to swipe, and for computers.
//   photoInFrame: { slot: photo }, or null while the photos are loading
//   justHung: { slot } when a photo has just gone up, to bring that frame into view
export default function Wall({ photoInFrame, canDecorate, showAlbum, justHung, onOpenPhoto, onPickFrame, onOpenAlbum }) {
  const { t } = useI18n()
  const wall = useRef(null)
  const stage = useRef(null)
  const [moreLeft, setMoreLeft] = useState(false)
  const [moreRight, setMoreRight] = useState(false)

  const filledSlots = Object.keys(photoInFrame ?? {}).map(Number)
  const slots = framesToShow(filledSlots, canDecorate)
  const stretches = stretchesFor(slots)

  // The arrows only show when there's more to see that way. The wall's length can change at any time
  // (a photo goes up, the phone turns), so the sizes are watched as well as the scrolling.
  useEffect(() => {
    const scroller = wall.current
    function checkArrows() {
      setMoreLeft(scroller.scrollLeft > 2)
      setMoreRight(scroller.scrollLeft + scroller.clientWidth < scroller.scrollWidth - 2)
    }
    checkArrows()
    scroller.addEventListener('scroll', checkArrows, { passive: true })
    const sizes = new ResizeObserver(checkArrows)
    sizes.observe(scroller)
    sizes.observe(stage.current)
    return () => {
      scroller.removeEventListener('scroll', checkArrows)
      sizes.disconnect()
    }
  }, [])

  // A new photo may land in a frame further along the wall: go there, so nobody wonders where it went.
  useEffect(() => {
    if (!justHung) return
    const frame = wall.current.querySelector(`[data-slot="${justHung.slot}"]`)
    if (!frame) return
    const box = frame.getBoundingClientRect()
    const left = wall.current.getBoundingClientRect().left
    const width = visibleWidth(wall.current)
    if (box.left >= left && box.right <= left + width) return // already in view
    wall.current.scrollBy({ left: box.left + box.width / 2 - (left + width / 2), behavior: scrollMotion() })
  }, [justHung])

  function move(direction) {
    wall.current.scrollBy({ left: direction * ARROW_STEP * visibleWidth(wall.current), behavior: scrollMotion() })
  }

  return (
    <>
      <RoomBackdrop />
      <div className="room-wall" ref={wall}>
        <div className="room-stage" ref={stage} style={{ '--wall': stretches * STRETCH_WIDTH }}>
          <RoomArt stretches={stretches} />
          {photoInFrame &&
            slots.map((slot) =>
              photoInFrame[slot] ? (
                <PhotoFrame key={slot} slot={slot} photo={photoInFrame[slot]} onOpen={onOpenPhoto} />
              ) : (
                <button
                  key={slot}
                  type="button"
                  className="frame empty"
                  data-slot={slot}
                  style={framePlace(FRAMES[slot])}
                  onClick={() => onPickFrame(slot)}
                  aria-label={t('room.addHere')}
                >
                  <PlusIcon />
                </button>
              ),
            )}
          {showAlbum && (
            <button
              type="button"
              className="album-spot"
              style={{ '--x': ALBUM_SPOT.x, '--y': ALBUM_SPOT.y, '--w': ALBUM_SPOT.width, '--h': ALBUM_SPOT.height }}
              onClick={onOpenAlbum}
              aria-label={t('album.open')}
            />
          )}
        </div>
      </div>
      {moreLeft && (
        <button type="button" className="wall-arrow left" onClick={() => move(-1)} aria-label={t('room.wallLeft')}>
          <BackIcon />
        </button>
      )}
      {moreRight && (
        <button type="button" className="wall-arrow right" onClick={() => move(1)} aria-label={t('room.wallRight')}>
          <ForwardIcon />
        </button>
      )}
    </>
  )
}

// Frames are placed in drawing units; room.css turns them into screen sizes.
function framePlace(frame) {
  return { '--x': frame.x, '--y': frame.y, '--w': frame.width, '--h': frame.height, '--tilt': `${frame.tilt}deg` }
}

// A frame with a photo in it. Its small copy downloads only when it comes near the screen:
// someone who never swipes along a full wall shouldn't pay for all 15.
function PhotoFrame({ slot, photo, onOpen }) {
  const { t } = useI18n()
  const [frame, nearScreen] = useNearScreen('.room-wall', '0px 100px')
  const look = FRAMES[slot]
  return (
    <button
      ref={frame}
      type="button"
      className={`frame ${look.look}`}
      data-slot={slot}
      style={framePlace(look)}
      onClick={() => onOpen(photo)}
      aria-label={photo.caption || t('room.photo')}
    >
      {nearScreen && <img src={photo.smallUrl} alt="" decoding="async" />}
    </button>
  )
}
