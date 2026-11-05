import { ROOM_HEIGHT, STRETCH_WIDTH } from './frames.js'

// The room is drawn in two layers, so the wall can be swiped without the drawing ever running out:
//   RoomBackdrop: wall, picture rail, skirting board and floor. It stays still, and it looks the same all the way
//                 along, so nobody can tell. It is drawn far wider and taller than the room and spills over
//                 its edges (overflow: visible), so it fills any screen shape without stretching.
//   RoomArt:      everything standing in the room. It moves when you swipe, and grows with the wall.
export function RoomBackdrop() {
  return (
    <svg className="room-backdrop" viewBox={`0 0 ${STRETCH_WIDTH} ${ROOM_HEIGHT}`} aria-hidden="true">
      <defs>
        <linearGradient id="room-wall" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="440">
          <stop offset="0" stopColor="#f1d8bb" />
          <stop offset="1" stopColor="#e3bf9a" />
        </linearGradient>
      </defs>
      <rect x="-2000" y="-2000" width="4390" height="2440" fill="url(#room-wall)" />
      <rect x="-2000" y="84" width="4390" height="5" fill="#c9a27c" opacity="0.6" />
      <rect x="-2000" y="440" width="4390" height="34" fill="#c9a27c" />
      <rect x="-2000" y="440" width="4390" height="4" fill="#a9825a" />
      <rect x="-2000" y="474" width="4390" height="2000" fill="#a87b52" />
      <path d="M-2000 500 H2390 M-2000 530 H2390 M-2000 562 H2390 M-2000 596 H2390" stroke="#8a6240" strokeWidth="1.5" opacity="0.5" />
    </svg>
  )
}

// stretches: how many stretches of wall to furnish (frames.js). The frames and the album are real buttons on top (Wall.jsx).
export default function RoomArt({ stretches }) {
  return (
    <svg className="room-art" viewBox={`0 0 ${stretches * STRETCH_WIDTH} ${ROOM_HEIGHT}`} aria-hidden="true">
      <defs>
        <linearGradient id="room-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2e2850" />
          <stop offset="0.7" stopColor="#6b4f8c" />
          <stop offset="1" stopColor="#c97a86" />
        </linearGradient>
        <radialGradient id="room-lamp">
          <stop offset="0" stopColor="#ffd978" stopOpacity="0.8" />
          <stop offset="1" stopColor="#ffd978" stopOpacity="0" />
        </radialGradient>
      </defs>
      <FirstStretch />
      {stretches >= 2 && <SecondStretch />}
      {stretches >= 3 && <ThirdStretch />}
    </svg>
  )
}

function Rug({ x }) {
  return (
    <>
      <ellipse cx={x} cy="560" rx="130" ry="30" fill="#c2553f" opacity="0.85" />
      <ellipse cx={x} cy="560" rx="100" ry="21" fill="none" stroke="#f6e7d0" strokeWidth="3" opacity="0.6" />
    </>
  )
}

// A window onto the night with curtains and a plant on the sill. Only one of them gets the moon.
function RoomWindow({ x = 0, moon = false }) {
  return (
    <g transform={`translate(${x} 0)`}>
      <rect x="30" y="120" width="130" height="150" rx="6" fill="#6d4a2e" />
      <rect x="38" y="128" width="114" height="134" rx="3" fill="url(#room-night)" />
      {moon && (
        <>
          <circle cx="122" cy="156" r="24" fill="#ffd9a0" opacity="0.35" />
          <circle cx="122" cy="156" r="11" fill="#fff1c9" />
        </>
      )}
      <circle cx="58" cy="146" r="1.6" fill="#fff6e9" opacity="0.8" />
      <circle cx="80" cy="138" r="1.3" fill="#fff6e9" opacity="0.7" />
      <circle cx="70" cy="176" r="1.5" fill="#fff6e9" opacity="0.8" />
      <rect x="93" y="128" width="4" height="134" fill="#6d4a2e" />
      <rect x="38" y="193" width="114" height="4" fill="#6d4a2e" />
      <path d="M20 112 h150 v10 h-150z" fill="#8a6240" />
      <path d="M24 122 C 40 160, 20 220, 44 272 L 24 272 Z" fill="#c94f4f" />
      <path d="M166 122 C 150 160, 170 220, 146 272 L 166 272 Z" fill="#c94f4f" />
      <rect x="26" y="268" width="140" height="10" rx="3" fill="#8a6240" />
      <ellipse cx="56" cy="266" rx="16" ry="6" fill="#5f8a5a" />
      <path d="M48 262 c-6 -14 4 -18 8 -8 c4 -10 14 -6 8 8z" fill="#4f7a4b" />
    </g>
  )
}

function FirstStretch() {
  return (
    <>
      <Rug x={195} />
      <RoomWindow moon />

      {/* a little shelf under the frames, with the photo album lying on it */}
      <rect x="140" y="426" width="88" height="6" rx="2" fill="#8a6240" />
      <path d="M152 432 l6 8 M216 432 l-6 8" stroke="#6d4a2e" strokeWidth="3" strokeLinecap="round" />
      <rect x="155" y="398" width="60" height="28" rx="3" fill="#fff6e9" />
      <path d="M155 404 H215 M155 410 H215 M155 416 H215" stroke="#e3d3bb" strokeWidth="1" />
      <rect x="151" y="392" width="64" height="30" rx="3" fill="#8e4a4a" />
      <rect x="151" y="392" width="9" height="30" rx="3" fill="#6f3838" />
      <rect x="170" y="398" width="34" height="18" rx="1.5" fill="#f2c14e" opacity="0.9" />
      <path d="M187 412 c-7 -5 -8 -11 -3.5 -11 c2 0 3 1.4 3.5 2.4 c0.5 -1 1.5 -2.4 3.5 -2.4 c4.5 0 3.5 6 -3.5 11z" fill="#8e4a4a" />

      {/* side table with the lamp and a little pile of letters */}
      <circle cx="300" cy="372" r="78" fill="url(#room-lamp)" />
      <rect x="248" y="408" width="110" height="10" rx="3" fill="#8a6240" />
      <rect x="256" y="418" width="8" height="62" fill="#6d4a2e" />
      <rect x="342" y="418" width="8" height="62" fill="#6d4a2e" />
      <path d="M278 372 h44 l12 30 h-68z" fill="#f2c14e" />
      <rect x="296" y="402" width="8" height="8" fill="#4a3b33" />
      <g transform="rotate(-8 262 400)">
        <rect x="236" y="390" width="40" height="26" rx="2" fill="#fff6e9" stroke="#d9c3a5" strokeWidth="1.5" />
        <path d="M236 392 L256 406 L276 392" fill="none" stroke="#d9c3a5" strokeWidth="1.5" />
      </g>
      <g transform="rotate(6 258 396)">
        <rect x="240" y="384" width="40" height="26" rx="2" fill="#fff1dd" stroke="#d9c3a5" strokeWidth="1.5" />
        <path d="M240 386 L260 400 L280 386" fill="none" stroke="#d9c3a5" strokeWidth="1.5" />
        <circle cx="260" cy="400" r="4" fill="#bf4c39" />
      </g>

      {/* the time capsule chest on the floor */}
      <rect x="300" y="500" width="70" height="40" rx="5" fill="#a9774f" />
      <path d="M300 506 a35 18 0 0 1 70 0 v4 h-70z" fill="#8a5e3c" />
      <rect x="300" y="510" width="70" height="4" fill="#6d4a2e" />
      <rect x="329" y="510" width="12" height="14" rx="3" fill="#f2c14e" />
      <circle cx="335" cy="517" r="2" fill="#6d4a2e" />
    </>
  )
}

// A tall plant in a pot, and a sideboard with a vase and a few books.
function SecondStretch() {
  return (
    <>
      <Rug x={620} />

      {/* the plant */}
      <path d="M436 432 C 428 396, 408 372, 388 362 C 412 362, 430 378, 438 402 C 434 368, 420 330, 402 306 C 428 322, 442 360, 444 396 C 448 352, 456 306, 480 276 C 480 322, 464 372, 450 432 Z" fill="#5f8a5a" />
      <path d="M446 432 C 452 402, 468 378, 498 368 C 482 390, 464 410, 456 432 Z" fill="#4f7a4b" />
      <path d="M418 430 h54 l-6 50 h-42z" fill="#b5643f" />
      <rect x="414" y="426" width="62" height="10" rx="3" fill="#c97a4f" />

      {/* the sideboard */}
      <rect x="512" y="372" width="222" height="8" rx="3" fill="#8a6240" />
      <rect x="518" y="380" width="210" height="84" rx="3" fill="#a9774f" />
      <path d="M623 380 V464" stroke="#6d4a2e" strokeWidth="3" />
      <circle cx="610" cy="422" r="3" fill="#f2c14e" />
      <circle cx="636" cy="422" r="3" fill="#f2c14e" />
      <rect x="530" y="464" width="8" height="16" fill="#6d4a2e" />
      <rect x="708" y="464" width="8" height="16" fill="#6d4a2e" />

      {/* a vase of flowers and a few books on top */}
      <path d="M552 372 c-10 -14 -8 -28 0 -34 h14 c8 6 10 20 0 34z" fill="#3f8f8b" />
      <path d="M558 338 v-20 M556 338 l-12 -16 M562 338 l12 -14" stroke="#4f7a4b" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <circle cx="558" cy="314" r="6" fill="#f2c14e" />
      <circle cx="543" cy="320" r="5" fill="#c94f4f" />
      <circle cx="575" cy="322" r="5" fill="#f6e7d0" />
      <rect x="664" y="360" width="50" height="12" rx="2" fill="#8e4a4a" />
      <rect x="670" y="350" width="42" height="10" rx="2" fill="#3f8f8b" />
    </>
  )
}

// An armchair, a second window, and a floor lamp.
function ThirdStretch() {
  return (
    <>
      <Rug x={960} />
      <RoomWindow x={870} />

      {/* the armchair */}
      <rect x="786" y="344" width="82" height="92" rx="16" fill="#8e4a4a" />
      <rect x="774" y="396" width="22" height="66" rx="10" fill="#7a3d3d" />
      <rect x="858" y="396" width="22" height="66" rx="10" fill="#7a3d3d" />
      <rect x="794" y="412" width="66" height="30" rx="8" fill="#a55a5a" />
      <rect x="786" y="440" width="82" height="24" rx="4" fill="#7a3d3d" />
      <rect x="792" y="464" width="7" height="16" fill="#6d4a2e" />
      <rect x="855" y="464" width="7" height="16" fill="#6d4a2e" />

      {/* the floor lamp */}
      <circle cx="1108" cy="356" r="72" fill="url(#room-lamp)" />
      <rect x="1105" y="366" width="5" height="108" fill="#4a3b33" />
      <rect x="1088" y="472" width="39" height="8" rx="3" fill="#4a3b33" />
      <path d="M1086 334 h44 l12 34 h-68z" fill="#f2c14e" />
    </>
  )
}
