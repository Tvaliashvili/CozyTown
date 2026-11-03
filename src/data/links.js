// The public address of the site. It's printed on cards and keychains as a QR code,
// so the house address format must never change (see CLAUDE.md).
const SITE = 'https://cozytown.ge'

// Always the real address, even on a test computer: this is what gets printed and shared.
export function houseUrl(code) {
  return `${SITE}/h/${code}`
}

// "cozytown.ge/h/ABCD234567": the same address, shorter, for printing under a QR code.
export function shortHouseUrl(code) {
  return houseUrl(code).replace('https://', '')
}
