// Where each neighbourhood sits on the drawing (public/art/town-map.svg).
//   label: where its name goes, in percent of the drawing's width and height.
//   area:  the part of the drawing that counts as that neighbourhood, as corner points in the
//          drawing's own units (it is 400 wide and 600 tall). Tapping anywhere in it opens the neighbourhood,
//          and it lights up under the mouse. Edges follow the snow line, the main road and the garden's edge.
// A new neighbourhood needs both, and something drawn for it.
export const MAP_PLACES = {
  'snowy-hills': {
    label: { x: 50, y: 15 },
    area: [[0, 0], [400, 0], [400, 180], [200, 176], [0, 176]],
  },
  'old-town': {
    // On the square; no further left, or the name runs off a 320 px phone.
    label: { x: 28, y: 50.5 },
    area: [[0, 176], [200, 176], [198, 432], [0, 436]],
  },
  riverside: {
    // Left of the river: the long Georgian name must still fit on a 320 px phone.
    label: { x: 66, y: 60 },
    area: [[200, 176], [400, 180], [400, 428], [198, 432]],
  },
  'garden-quarter': {
    label: { x: 50, y: 85 },
    area: [[0, 436], [198, 432], [400, 428], [400, 600], [0, 600]],
  },
}
