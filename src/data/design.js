import { TABS } from './options.js'

// A house design is a plain object. This exact shape is saved in the database (houses.design).
export const DEFAULT_DESIGN = {
  wallColor: '#f6e7d0',
  roofStyle: 'gable',
  roofColor: '#c2553f',
  doorStyle: 'arched',
  doorColor: '#3f6e8c',
  windowStyle: 'shuttered',
  windowColor: '#5f8a5a',
  garden: 'flowers',
  fence: true,
  mailboxColor: '#c94f4f',
  lanterns: 2,
}

// Every field and the values it may have, taken from the customizer's tabs.
const ALLOWED = Object.fromEntries(TABS.flatMap((tab) => tab.controls.map((c) => [c.field, c.options])))

// Keeps only values the customizer offers; anything else falls back to the default.
// Designs come from the database and from people's browsers, so we never trust them blindly.
// This also means designs saved before a new option existed still work.
export function cleanDesign(raw) {
  const clean = { ...DEFAULT_DESIGN }
  for (const field of Object.keys(clean)) {
    if (raw && ALLOWED[field]?.includes(raw[field])) clean[field] = raw[field]
  }
  return clean
}

// The demo street at /town: which plot is "your house" (index into PLOT_XS, counted from the left).
export const MY_PLOT = 3

// Pretend neighbours on the demo street, so it feels lived-in. Plots not listed here are free.
export const NEIGHBOURS = {
  1: {
    wallColor: '#c9daf0', roofStyle: 'hip', roofColor: '#4f6d8f', doorStyle: 'square', doorColor: '#fff6e9',
    windowStyle: 'square', windowColor: '#fff6e9', garden: 'hedge', fence: false, mailboxColor: '#3f6e8c', lanterns: 1,
  },
  2: {
    wallColor: '#f7dc8f', roofStyle: 'gable', roofColor: '#7a4a3a', doorStyle: 'arched', doorColor: '#c94f4f',
    windowStyle: 'round', windowColor: '#a9774f', garden: 'vegetables', fence: true, mailboxColor: '#5f8a5a', lanterns: 0,
  },
  5: {
    wallColor: '#a8d8d2', roofStyle: 'flat', roofColor: '#3f3f4f', doorStyle: 'square', doorColor: '#f2c14e',
    windowStyle: 'square', windowColor: '#4a3b33', garden: 'flowers', fence: false, mailboxColor: '#fff6e9', lanterns: 2,
  },
  7: {
    wallColor: '#cfe3d2', roofStyle: 'gable', roofColor: '#5f8a5a', doorStyle: 'arched', doorColor: '#a9774f',
    windowStyle: 'shuttered', windowColor: '#c94f4f', garden: 'hedge', fence: true, mailboxColor: '#c94f4f', lanterns: 1,
  },
}

// Signs on the pretend neighbours, so the demo shows what a street with life in it looks like.
export const NEIGHBOUR_SIGNS = {
  1: { giftBow: true },
  2: { newLetter: true },
  5: { capsuleGift: true },
}

const STORAGE_KEY = 'myHouseDesign'

// The demo house is kept in this browser only; real houses live in the database (houses.js).
// localStorage can be blocked (private browsing), so every access is wrapped in try/catch.
export function loadDesign() {
  try {
    return cleanDesign(JSON.parse(localStorage.getItem(STORAGE_KEY)))
  } catch {
    return DEFAULT_DESIGN
  }
}

export function saveDesign(design) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(design))
  } catch {}
}
