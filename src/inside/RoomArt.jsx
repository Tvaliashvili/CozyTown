import { ROOM_WIDTH, ROOM_HEIGHT } from './frames.js'

// The drawing of the room: warm wall, a window onto the night, a lamp and letters on the
// side table, and the time capsule chest. The picture frames are real buttons on top (Room.jsx).
//
// The wall and floor are drawn far wider and taller than the room itself, and the drawing is
// allowed to spill over its edges (overflow: visible), so on any screen shape the wall reaches
// the sides and the floor reaches the bottom without stretching anything.
export default function RoomArt() {
  return (
    <svg className="room-art" viewBox={`0 0 ${ROOM_WIDTH} ${ROOM_HEIGHT}`} aria-hidden="true">
      <defs>
        <linearGradient id="room-wall" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="440">
          <stop offset="0" stopColor="#f1d8bb" />
          <stop offset="1" stopColor="#e3bf9a" />
        </linearGradient>
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

      {/* wall, picture rail, skirting board and wooden floor */}
      <rect x="-2000" y="-2000" width="4390" height="2440" fill="url(#room-wall)" />
      <rect x="-2000" y="84" width="4390" height="5" fill="#c9a27c" opacity="0.6" />
      <rect x="-2000" y="440" width="4390" height="34" fill="#c9a27c" />
      <rect x="-2000" y="440" width="4390" height="4" fill="#a9825a" />
      <rect x="-2000" y="474" width="4390" height="2000" fill="#a87b52" />
      <path d="M-2000 500 H2390 M-2000 530 H2390 M-2000 562 H2390 M-2000 596 H2390" stroke="#8a6240" strokeWidth="1.5" opacity="0.5" />
      <ellipse cx="195" cy="560" rx="130" ry="30" fill="#c2553f" opacity="0.85" />
      <ellipse cx="195" cy="560" rx="100" ry="21" fill="none" stroke="#f6e7d0" strokeWidth="3" opacity="0.6" />

      {/* window onto the night, with curtains and a plant on the sill */}
      <rect x="30" y="120" width="130" height="150" rx="6" fill="#6d4a2e" />
      <rect x="38" y="128" width="114" height="134" rx="3" fill="url(#room-night)" />
      <circle cx="122" cy="156" r="24" fill="#ffd9a0" opacity="0.35" />
      <circle cx="122" cy="156" r="11" fill="#fff1c9" />
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
    </svg>
  )
}
