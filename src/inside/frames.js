// The room drawing is 390 × 480 units (one unit = one pixel on a typical phone).
// The frames are measured in the same units, so they always sit on the same spot of the wall.
export const ROOM_WIDTH = 390
export const ROOM_HEIGHT = 480

// Where the photo album stands on its little shelf (drawn in RoomArt.jsx, a real button on top in Room.jsx).
export const ALBUM_SPOT = { x: 146, y: 388, width: 76, height: 38 }

// The picture frames on the wall. A photo's "slot" in the database is its place in this list;
// a photo with no slot is only in the album. The database only allows slots 0-4
// (supabase/migrations/20261103200000_inside_the_house.sql), so adding a frame here needs a new migration too.
//   tilt: degrees, so the frames look hung by hand
//   look: 'wood', 'dark' or 'cream' (colors in room.css)
export const FRAMES = [
  { x: 196, y: 92, width: 88, height: 104, tilt: -3, look: 'wood' },
  { x: 300, y: 98, width: 68, height: 68, tilt: 2, look: 'dark' },
  { x: 226, y: 212, width: 128, height: 78, tilt: 1.5, look: 'cream' },
  { x: 40, y: 312, width: 84, height: 96, tilt: -1.5, look: 'wood' },
  { x: 142, y: 318, width: 80, height: 64, tilt: 2, look: 'dark' },
]
