// House measurements shared by all the parts, relative to the middle of the plot.
// The street is towards +Z.

export const WALL_WIDTH = 4
export const WALL_DEPTH = 3
export const WALL_HEIGHT = 2.4
export const FOUNDATION_HEIGHT = 0.24

export const HOUSE_Z = -0.8 // the house sits towards the back of the plot
export const FRONT_Z = HOUSE_Z + WALL_DEPTH / 2 // the wall facing the street

export const ROOF_PITCH = 0.62 // slope of a pointed roof, in radians (about 35°)
export const GABLE_RISE = (WALL_WIDTH / 2) * Math.tan(ROOF_PITCH) // height of the pointed roof's triangle

export const FENCE_Z = 2.5
