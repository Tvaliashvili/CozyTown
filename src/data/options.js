// Everything a house can be. To add a new color or style, add it here
// (and a translation in src/i18n for style names).

export const WALL_COLORS = ['#f6e7d0', '#f4c7b8', '#cfe3d2', '#a8d8d2', '#c9daf0', '#f7dc8f', '#e8b4a0', '#d9c8e8', '#ffffff']
export const ROOF_COLORS = ['#c2553f', '#7a4a3a', '#4f6d8f', '#5f8a5a', '#8e5b8a', '#2a7f8a']
export const DOOR_COLORS = ['#a9774f', '#c94f4f', '#3f6e8c', '#5f8a5a', '#f2c14e', '#fff6e9']
export const WINDOW_COLORS = ['#fff6e9', '#3f6e8c', '#5f8a5a', '#c94f4f', '#a9774f', '#4a3b33']
export const MAILBOX_COLORS = ['#c94f4f', '#3f6e8c', '#5f8a5a', '#3a9a9a', '#fff6e9', '#4a3b33']

export const ROOF_STYLES = ['gable', 'hip', 'flat']
export const DOOR_STYLES = ['arched', 'square']
export const WINDOW_STYLES = ['square', 'round', 'shuttered']
export const GARDENS = ['flowers', 'hedge', 'vegetables', 'none']
export const FENCE_CHOICES = [true, false]
export const LANTERN_COUNTS = [0, 1, 2]

// The customizer's tabs and what each one lets you change.
// type 'color' shows round swatches, type 'choice' shows labelled tiles.
export const TABS = [
  { id: 'walls', controls: [{ field: 'wallColor', type: 'color', options: WALL_COLORS }] },
  {
    id: 'roof',
    controls: [
      { field: 'roofStyle', type: 'choice', options: ROOF_STYLES },
      { field: 'roofColor', type: 'color', options: ROOF_COLORS },
    ],
  },
  {
    id: 'door',
    controls: [
      { field: 'doorStyle', type: 'choice', options: DOOR_STYLES },
      { field: 'doorColor', type: 'color', options: DOOR_COLORS },
    ],
  },
  {
    id: 'windows',
    controls: [
      { field: 'windowStyle', type: 'choice', options: WINDOW_STYLES },
      { field: 'windowColor', type: 'color', options: WINDOW_COLORS },
    ],
  },
  {
    id: 'garden',
    controls: [
      { field: 'garden', type: 'choice', options: GARDENS },
      { field: 'fence', type: 'choice', options: FENCE_CHOICES },
    ],
  },
  {
    id: 'extras',
    controls: [
      { field: 'lanterns', type: 'choice', options: LANTERN_COUNTS },
      { field: 'mailboxColor', type: 'color', options: MAILBOX_COLORS },
    ],
  },
]
