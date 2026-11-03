// Small icons drawn as SVG. Line icons use "currentColor", so they take the text color of their button.
// They are decoration only (aria-hidden): every button they sit in also has words.

function Line({ size = 22, children }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export const BackIcon = () => <Line><path d="M15 18l-6-6 6-6" /></Line>

export const GiftIcon = () => (
  <Line>
    <path d="M20 12v9H4v-9" /><path d="M2 7h20v5H2z" /><path d="M12 22V7" />
    <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" /><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
  </Line>
)

export const KeyIcon = () => (
  <Line><circle cx="8" cy="15" r="4" /><path d="M11 12 L21 2" /><path d="M17 6l3 3" /><path d="M14 9l2 2" /></Line>
)

export const ChatIcon = () => <Line><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></Line>

export const SlideIcon = () => (
  <Line size={20}><path d="M8 12h8" /><path d="M5 12l3-3M5 12l3 3M19 12l-3-3M19 12l-3 3" /></Line>
)

export const CheckIcon = () => <Line size={24}><path d="M5 12l5 5 9-10" /></Line>

export const LockIcon = () => <Line size={26}><rect x="4" y="10" width="16" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></Line>
export const HouseIcon = () => <Line size={26}><path d="M3 11 L12 4 L21 11" /><path d="M5 10v10h14V10" /><rect x="10" y="14" width="4" height="6" /></Line>
export const DownloadIcon = () => <Line size={26}><path d="M12 3v12" /><path d="M7 10l5 5 5-5" /><path d="M4 21h16" /></Line>

// Inside the house
export const AddPhotoIcon = () => (
  <Line><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 8" /><path d="M19 3v4M17 5h4" /></Line>
)
export const PlusIcon = () => <Line size={32}><path d="M12 5v14M5 12h14" /></Line>
export const LetterIcon = () => <Line size={28}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Line>
export const PenIcon = () => <Line><path d="M4 20l4-1 11-11-3-3L5 16z" /><path d="M14 6l3 3" /></Line>
export const TrashIcon = () => <Line><path d="M4 7h16" /><path d="M10 11v6M14 11v6" /><path d="M6 7l1 13h10l1-13" /><path d="M9 7V4h6v3" /></Line>
export const ShareIcon = () => (
  <Line size={18}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /></Line>
)
export const DoorIcon = () => <Line><path d="M6 21V9a6 6 0 0 1 12 0v12" /><path d="M4 21h16" /><circle cx="14.5" cy="14" r="1" /></Line>

// One icon per customizer tab (ids from src/data/options.js).
export const TAB_ICONS = {
  walls: () => <Line size={24}><rect x="3" y="5" width="18" height="14" rx="1" /><path d="M3 10h18M3 15h18M9 5v5M15 10v5M9 15v4" /></Line>,
  roof: () => <Line size={24}><path d="M3 13 L12 4 L21 13" /><path d="M6 11v8h12v-8" /></Line>,
  door: () => <Line size={24}><path d="M6 21 V9 a6 6 0 0 1 12 0 V21" /><path d="M4 21h16" /><circle cx="14.5" cy="14" r="1" /></Line>,
  windows: () => <Line size={24}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M12 4v16M4 12h16" /></Line>,
  garden: () => <Line size={24}><circle cx="12" cy="8" r="3" /><path d="M12 11v10" /><path d="M12 16c-3 0-5-2-5-4 3 0 5 2 5 4z" /><path d="M12 18c3 0 5-2 5-4-3 0-5 2-5 4z" /></Line>,
  extras: () => <Line size={24}><path d="M9 3h6M12 3v2" /><path d="M7 9l1-4h8l1 4" /><rect x="7" y="9" width="10" height="9" rx="2" /><path d="M9 21h6" /></Line>,
}

// Colourful little pictures for the landing page.
export const PICTURES = {
  decorate: (
    <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
      <rect x="30" y="8" width="10" height="30" rx="3" fill="#a9774f" transform="rotate(35 35 23)" />
      <path d="M18 40 c-4 4 -4 10 -8 14 c8 0 14 -2 18 -8z" fill="#f6e7d0" stroke="#a9774f" strokeWidth="2" />
      <circle cx="46" cy="46" r="9" fill="#c2553f" /><circle cx="49" cy="43" r="3" fill="#ffffff" opacity="0.5" />
    </svg>
  ),
  key: (
    <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
      <circle cx="18" cy="14" r="8" fill="none" stroke="#8a6a4a" strokeWidth="3" />
      <path d="M24 19 L30 25" stroke="#8a6a4a" strokeWidth="3" strokeLinecap="round" />
      <rect x="24" y="22" width="32" height="32" rx="7" fill="#d9b58c" stroke="#a9774f" strokeWidth="2" />
      <rect x="30" y="28" width="7" height="7" fill="#4a3b33" /><rect x="43" y="28" width="7" height="7" fill="#4a3b33" />
      <rect x="30" y="41" width="7" height="7" fill="#4a3b33" /><rect x="43" y="41" width="3" height="3" fill="#4a3b33" />
      <rect x="47" y="45" width="3" height="3" fill="#4a3b33" /><rect x="43" y="45" width="3" height="3" fill="#bf4c39" />
    </svg>
  ),
  door: (
    <svg viewBox="0 0 64 64" width="64" height="64" aria-hidden="true">
      <path d="M14 56 L14 14 Q32 10 50 14 L50 56 Z" fill="#f6e7d0" />
      <path d="M20 56 L20 20 L44 20 L44 56 Z" fill="#fff0b8" />
      <path d="M20 20 L32 24 L32 56 L20 56 Z" fill="#3f6e8c" />
      <circle cx="29" cy="40" r="2" fill="#f2c14e" />
      <path d="M44 30 l10 -4 l0 20 l-10 4z" fill="#ffd978" opacity="0.5" />
      <path d="M8 56 H56" stroke="#a9774f" strokeWidth="3" strokeLinecap="round" />
    </svg>
  ),
  photos: (
    <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
      <rect x="6" y="8" width="44" height="40" rx="4" fill="#a9774f" /><rect x="12" y="14" width="32" height="28" fill="#fde4c8" />
      <circle cx="22" cy="24" r="4" fill="#f2c14e" /><path d="M12 42 l10 -10 7 7 6 -5 9 8z" fill="#8fb77a" />
    </svg>
  ),
  letters: (
    <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
      <rect x="6" y="14" width="44" height="32" rx="4" fill="#fff6e9" stroke="#d9b58c" strokeWidth="2" />
      <path d="M6 18 L28 34 L50 18" fill="none" stroke="#d9b58c" strokeWidth="2" />
      <circle cx="28" cy="34" r="7" fill="#bf4c39" /><circle cx="28" cy="34" r="3.5" fill="none" stroke="#f6c9bd" strokeWidth="1.5" />
    </svg>
  ),
  capsule: (
    <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
      <rect x="8" y="24" width="40" height="24" rx="4" fill="#a9774f" /><path d="M8 28 a20 12 0 0 1 40 0 v2 H8z" fill="#8a5e3c" />
      <rect x="8" y="30" width="40" height="3" fill="#6d4a2e" /><rect x="24" y="30" width="8" height="10" rx="2" fill="#f2c14e" />
      <circle cx="28" cy="35" r="1.5" fill="#6d4a2e" />
    </svg>
  ),
  lanterns: (
    <svg viewBox="0 0 56 56" width="56" height="56" aria-hidden="true">
      <circle cx="28" cy="32" r="22" fill="#ffd978" opacity="0.35" /><rect x="24" y="6" width="8" height="4" rx="2" fill="#4a3b33" />
      <path d="M18 14 h20 l2 8 h-24z" fill="#4a3b33" /><rect x="18" y="22" width="20" height="18" rx="3" fill="#ffe08a" stroke="#4a3b33" strokeWidth="2" />
      <path d="M28 26 c-3 4 -3 7 0 10 c3 -3 3 -6 0 -10z" fill="#f08a5d" /><rect x="16" y="40" width="24" height="5" rx="2" fill="#4a3b33" />
    </svg>
  ),
  heart: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 21s-7-4.6-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.4-9.5 9-9.5 9z" fill="#c94f4f" />
    </svg>
  ),
  flower: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <g fill="#f08a5d"><circle cx="12" cy="4" r="2.6" /><circle cx="16.5" cy="6.5" r="2.6" /><circle cx="17" cy="11.5" r="2.6" /><circle cx="7" cy="11.5" r="2.6" /><circle cx="7.5" cy="6.5" r="2.6" /></g>
      <circle cx="12" cy="9" r="3" fill="#f2c14e" /><path d="M12 12v9" stroke="#5f8a5a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
  star: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M12 2 l2.4 6.5 6.6 .4 -5.2 4.2 1.8 6.5 -5.6 -3.8 -5.6 3.8 1.8 -6.5 -5.2 -4.2 6.6 -.4z" fill="#4f7fb0" />
    </svg>
  ),
  home: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M4 20 L4 10 L12 4 L20 10 L20 20 Z" fill="#5f8a5a" /><rect x="10" y="13" width="4" height="7" fill="#fff0b8" />
    </svg>
  ),
  candle: (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect x="9" y="9" width="6" height="12" rx="1.5" fill="#f6e7d0" />
      <path d="M12 3c-1.6 2-2.4 3.4-2.4 4.6a2.4 2.4 0 0 0 4.8 0C14.4 6.4 13.6 5 12 3z" fill="#f2c14e" />
    </svg>
  ),
}

// The Cozy Town logo: a little house with lit windows.
export function Logo() {
  return (
    <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true">
      <path d="M6 19 L20 7 L34 19" fill="none" stroke="#fff6e9" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="10" y="18" width="20" height="16" rx="2.5" fill="#fff6e9" />
      <rect x="14" y="22" width="5" height="5" rx="1" fill="#f2c14e" /><rect x="21.5" y="22" width="5" height="5" rx="1" fill="#f2c14e" />
      <rect x="17.5" y="28" width="5" height="6" rx="1.5" fill="#bf4c39" />
    </svg>
  )
}
