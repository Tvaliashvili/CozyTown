// Where each neighbourhood sits on the drawing (public/art/town-map.svg).
//   label: where its name goes, in percent of the drawing's width and height.
//   area:  the part of the drawing that counts as that neighbourhood, as corner points in the
//          drawing's own units (it is 400 wide and 600 tall). Tapping anywhere in it opens the neighbourhood.
// A new neighbourhood needs both, and something drawn for it.
export const MAP_PLACES = {
  'snowy-hills': {
    label: { x: 50, y: 20 },
    area: [[0, 50], [400, 50], [400, 218], [0, 228]],
  },
  'old-town': {
    label: { x: 30, y: 36 },
    // Its right edge follows the footpath that runs down from the hills.
    area: [[0, 228], [185, 215], [170, 300], [150, 400], [190, 470], [0, 470]],
  },
  riverside: {
    label: { x: 71, y: 64 },
    area: [[185, 215], [400, 218], [400, 452], [200, 456], [190, 470], [150, 400], [170, 300]],
  },
  'garden-quarter': {
    label: { x: 50, y: 83 },
    area: [[0, 470], [200, 456], [400, 452], [400, 600], [0, 600]],
  },
}
