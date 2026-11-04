// Where everything sits on the town map's two drawings: town-map.svg for tall screens,
// town-map-wide.svg for wide ones. Same town, laid out to fit each shape.
//   viewBox: the drawing's own units. Must match the viewBox in its .svg file.
//   label:   where a neighbourhood's name goes, in percent of the drawing's width and height.
//   area:    the part of the drawing that counts as that neighbourhood, as an SVG path in the
//            drawing's own units. Tapping anywhere in it opens the neighbourhood, and it lights up under the mouse.
// A new neighbourhood needs a place in both layouts, and something drawn for it in both files.
export const MAP_LAYOUTS = {
  tall: {
    viewBox: '0 135 390 704',
    places: {
      'snowy-hills': {
        label: { x: 44, y: 16.5 },
        area: 'M18 148 H372 V300 C300 318 230 292 160 312 C100 326 60 300 18 312 Z',
      },
      'old-town': {
        // On the empty square; no further left, or the long Georgian name runs off a 320 px phone.
        label: { x: 28, y: 45.5 },
        area: 'M18 312 C60 300 100 326 160 312 C176 310 190 314 200 316 C190 410 204 500 192 610 C130 624 70 600 18 616 Z',
      },
      riverside: {
        // Low enough to clear the Old Town's name, which reaches this far on a 320 px phone in Georgian.
        label: { x: 72, y: 55.5 },
        area: 'M200 316 C240 302 310 312 372 300 V604 C320 618 260 596 192 610 C204 500 190 410 200 316 Z',
      },
      'garden-quarter': {
        label: { x: 46, y: 82 },
        area: 'M18 616 C70 600 130 624 192 610 C260 596 320 618 372 604 V826 H18 Z',
      },
    },
  },
  wide: {
    viewBox: '0 0 1000 600',
    places: {
      'snowy-hills': {
        label: { x: 34, y: 15 },
        area: 'M14 14 H986 V172 C800 192 640 164 480 182 C320 202 160 170 14 186 Z',
      },
      'old-town': {
        label: { x: 24, y: 51 },
        area: 'M14 186 C160 170 320 202 480 182 C468 270 488 350 470 432 C320 448 160 420 14 438 Z',
      },
      riverside: {
        label: { x: 62, y: 50 },
        area: 'M480 182 C640 164 800 192 986 172 V424 C800 444 640 416 470 432 C488 350 468 270 480 182 Z',
      },
      'garden-quarter': {
        label: { x: 42, y: 84 },
        area: 'M14 438 C160 420 320 448 470 432 C640 416 800 444 986 424 V586 H14 Z',
      },
    },
  },
}
