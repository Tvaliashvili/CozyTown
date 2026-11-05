// The room is measured in "units" (one unit = about one pixel on a typical phone).
// It is 480 units tall. Its wall is made of stretches, each 390 units wide; a phone shows about one at a time,
// and you swipe along the wall to see the next. A stretch only exists once it has something to show.
export const STRETCH_WIDTH = 390
export const ROOM_HEIGHT = 480

// Where the photo album stands on its little shelf (drawn in RoomArt.jsx, a real button on top in Wall.jsx).
export const ALBUM_SPOT = { x: 146, y: 388, width: 76, height: 38 }

const FRAMES_PER_STRETCH = 5
// A new house starts with the frames of the first stretch, so the room looks furnished from the first day.
const FRAMES_AT_START = 5
// How many empty frames the keeper sees after their last photo. More would look like a list of chores.
const EMPTY_FRAMES_AHEAD = 2

// The picture frames on the wall. A photo's "slot" in the database is its place in this list;
// a photo with no slot is only in the album. The database only allows slots 0-14
// (supabase/migrations/20261112000000_fifteen_frames.sql), so adding a frame here needs a new migration too.
// Never move the first frames around too much: people's photos are already hanging in them.
//   tilt: degrees, so the frames look hung by hand
//   look: 'wood', 'dark' or 'cream' (colors in room.css)
export const FRAMES = [
  // First stretch: beside the window, above the shelf and the side table
  { x: 196, y: 92, width: 88, height: 104, tilt: -3, look: 'wood' },
  { x: 300, y: 98, width: 68, height: 68, tilt: 2, look: 'dark' },
  { x: 226, y: 212, width: 128, height: 78, tilt: 1.5, look: 'cream' },
  { x: 40, y: 312, width: 84, height: 96, tilt: -1.5, look: 'wood' },
  { x: 142, y: 318, width: 80, height: 64, tilt: 2, look: 'dark' },
  // Second stretch: above the plant and the sideboard. The first one starts a little early,
  // so its edge peeks in on a phone and shows that the wall carries on.
  { x: 376, y: 100, width: 100, height: 124, tilt: 2, look: 'wood' },
  { x: 492, y: 94, width: 124, height: 84, tilt: -1.5, look: 'cream' },
  { x: 634, y: 100, width: 96, height: 96, tilt: 2, look: 'dark' },
  { x: 500, y: 196, width: 86, height: 104, tilt: 1.5, look: 'dark' },
  { x: 604, y: 212, width: 130, height: 92, tilt: -2, look: 'wood' },
  // Third stretch: around the second window, above the armchair and the floor lamp
  { x: 762, y: 98, width: 112, height: 88, tilt: -2, look: 'wood' },
  { x: 776, y: 202, width: 90, height: 108, tilt: 1.5, look: 'cream' },
  { x: 1056, y: 96, width: 92, height: 112, tilt: 2, look: 'dark' },
  { x: 1050, y: 226, width: 108, height: 84, tilt: -1.5, look: 'wood' },
  { x: 902, y: 296, width: 126, height: 96, tilt: 1, look: 'cream' },
]

// Which frames to draw, so the wall grows with the photos instead of starting out long and bare.
//   Visitors: only the ones with a photo.
//   Keeper and helpers: everything up to the last photo, plus a couple of empty ones to fill next.
export function framesToShow(filledSlots, canDecorate) {
  if (!canDecorate) return [...filledSlots].sort((a, b) => a - b)
  const lastFilled = Math.max(-1, ...filledSlots)
  const count = Math.min(FRAMES.length, Math.max(FRAMES_AT_START, lastFilled + 1 + EMPTY_FRAMES_AHEAD))
  return FRAMES.slice(0, count).map((_, slot) => slot)
}

// How many stretches of wall those frames need. Always at least the first, which has the album and the window.
export function stretchesFor(slots) {
  return Math.floor(Math.max(0, ...slots) / FRAMES_PER_STRETCH) + 1
}
