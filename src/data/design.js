import { TABS } from './options.js'

// A house design is a plain object. In Phase 2 this exact shape gets saved to the database.
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

// Which plot is "your house" in this prototype (index into PLOT_XS, counted from the left).
export const MY_PLOT = 3

// Pretend neighbours so the street feels lived-in. Plots not listed here are free.
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
    wallColor: '#d9c8e8', roofStyle: 'flat', roofColor: '#3f3f4f', doorStyle: 'square', doorColor: '#f2c14e',
    windowStyle: 'square', windowColor: '#4a3b33', garden: 'flowers', fence: false, mailboxColor: '#fff6e9', lanterns: 2,
  },
  7: {
    wallColor: '#cfe3d2', roofStyle: 'gable', roofColor: '#5f8a5a', doorStyle: 'arched', doorColor: '#a9774f',
    windowStyle: 'shuttered', windowColor: '#c94f4f', garden: 'hedge', fence: true, mailboxColor: '#c94f4f', lanterns: 1,
  },
}

const STORAGE_KEY = 'myHouseDesign'

// localStorage can be blocked (private browsing), so every access is wrapped in try/catch.
export function loadDesign() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY))
    // Merging with the default means designs saved before a new option existed still work.
    return saved ? { ...DEFAULT_DESIGN, ...saved } : DEFAULT_DESIGN
  } catch {
    return DEFAULT_DESIGN
  }
}

export function saveDesign(design) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(design))
  } catch {}
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)]
}

// "Surprise me": a random choice for every option in every tab.
export function randomDesign() {
  const design = {}
  for (const tab of TABS) {
    for (const control of tab.controls) {
      design[control.field] = pick(control.options)
    }
  }
  return design
}
