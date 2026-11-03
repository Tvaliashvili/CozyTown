// Where things sit in the town. One unit is roughly one meter.
// The street runs left-right along X; houses face the camera (towards +Z).

export const PLOT_WIDTH = 6
export const PLOT_COUNT = 8

// Center of each plot along the street, left to right, with the street centered on 0.
export const PLOT_XS = Array.from({ length: PLOT_COUNT }, (_, i) => (i - (PLOT_COUNT - 1) / 2) * PLOT_WIDTH)

export const PLOT_Z = -4 // middle of each plot, behind the sidewalk
export const SIDEWALK_Z = 0.4
export const ROAD_Z = 3
export const STREET_LENGTH = PLOT_COUNT * PLOT_WIDTH + 16

// How far left/right the camera may pan.
export const STREET_START = PLOT_XS[0]
export const STREET_END = PLOT_XS[PLOT_XS.length - 1]
