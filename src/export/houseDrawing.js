import { cleanDesign } from '../data/design.js'

// A flat, front-on drawing of a house as SVG text, for the offline page in the export zip.
// It uses the same design as the 3D house (src/data/design.js), so the colors and styles match,
// but it's plain SVG: it opens in any browser, years from now, without three.js or internet.
export function houseDrawing(rawDesign) {
  const d = cleanDesign(rawDesign)
  const parts = []

  // sky glow and ground
  parts.push('<rect x="0" y="0" width="240" height="200" fill="#f6cfae"/>')
  parts.push('<rect x="0" y="176" width="240" height="24" fill="#8fbf7a"/>')

  // roof (drawn first, so the walls sit in front of its edge)
  if (d.roofStyle === 'gable') parts.push(`<path d="M44 96 L120 36 L196 96 Z" fill="${d.roofColor}"/>`)
  if (d.roofStyle === 'hip') parts.push(`<path d="M44 96 L78 50 L162 50 L196 96 Z" fill="${d.roofColor}"/>`)
  if (d.roofStyle === 'flat') parts.push(`<rect x="50" y="80" width="140" height="16" rx="2" fill="${d.roofColor}"/>`)

  // walls
  parts.push(`<rect x="56" y="94" width="128" height="84" fill="${d.wallColor}" stroke="#4a3b33" stroke-opacity="0.15"/>`)

  // two windows, warm light inside
  for (const x of [70, 146]) {
    if (d.windowStyle === 'round') {
      parts.push(`<circle cx="${x + 12}" cy="122" r="12" fill="#ffe7a3" stroke="${d.windowColor}" stroke-width="3"/>`)
    } else {
      parts.push(`<rect x="${x}" y="110" width="24" height="24" fill="#ffe7a3" stroke="${d.windowColor}" stroke-width="3"/>`)
      parts.push(`<path d="M${x + 12} 110 V134 M${x} 122 H${x + 24}" stroke="${d.windowColor}" stroke-width="2"/>`)
    }
    if (d.windowStyle === 'shuttered') {
      parts.push(`<rect x="${x - 9}" y="110" width="7" height="24" fill="${d.windowColor}"/>`)
      parts.push(`<rect x="${x + 26}" y="110" width="7" height="24" fill="${d.windowColor}"/>`)
    }
  }

  // door
  if (d.doorStyle === 'arched') {
    parts.push(`<path d="M108 178 V140 A12 12 0 0 1 132 140 V178 Z" fill="${d.doorColor}"/>`)
  } else {
    parts.push(`<rect x="108" y="134" width="24" height="44" fill="${d.doorColor}"/>`)
  }
  parts.push('<circle cx="127" cy="158" r="1.8" fill="#f2c14e"/>')

  // lanterns beside the door
  const lanternXs = [[], [100], [100, 140]][d.lanterns] ?? []
  for (const x of lanternXs) {
    parts.push(`<rect x="${x - 3}" y="140" width="6" height="9" rx="1.5" fill="#f2c14e" stroke="#4a3b33" stroke-width="1"/>`)
  }

  // garden
  if (d.garden === 'flowers') {
    const colors = ['#c94f4f', '#f2c14e', '#d9c8e8', '#f4c7b8']
    for (let i = 0; i < 8; i++) {
      const x = i < 4 ? 30 + i * 6 : 186 + (i - 4) * 6
      parts.push(`<circle cx="${x}" cy="174" r="3" fill="${colors[i % colors.length]}"/>`)
    }
  }
  if (d.garden === 'hedge') {
    parts.push('<rect x="22" y="160" width="32" height="18" rx="8" fill="#4f7a4b"/>')
    parts.push('<rect x="186" y="160" width="32" height="18" rx="8" fill="#4f7a4b"/>')
  }
  if (d.garden === 'vegetables') {
    for (let i = 0; i < 4; i++) {
      parts.push(`<path d="M${24 + i * 8} 178 l3 -9 l3 9 Z" fill="#5f8a5a"/>`)
      parts.push(`<path d="M${190 + i * 8} 178 l3 -9 l3 9 Z" fill="#5f8a5a"/>`)
    }
  }

  // fence along the front
  if (d.fence) {
    let pickets = ''
    for (let x = 8; x < 236; x += 10) {
      if (x > 100 && x < 140) continue // a gap for the path to the door
      pickets += `<rect x="${x}" y="182" width="4" height="14" fill="#fff6e9" stroke="#a9825a" stroke-width="0.8"/>`
    }
    parts.push(pickets)
  }

  // mailbox
  parts.push('<rect x="205" y="160" width="3" height="20" fill="#6d4a2e"/>')
  parts.push(`<rect x="198" y="150" width="17" height="11" rx="3" fill="${d.mailboxColor}"/>`)

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 200" role="img">${parts.join('')}</svg>`
}
