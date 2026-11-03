// A plain day like '2030-02-14' (no time), e.g. when the time capsule opens: "14 February 2030".
// Read as UTC so a phone in another time zone doesn't show the day before.
export function formatDay(day, lang) {
  const locale = lang === 'ka' ? 'ka-GE' : 'en-GB'
  return new Date(`${day}T00:00:00Z`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

// "3 November 2026", in the language the page is shown in.
export function formatDate(isoDate, lang) {
  const locale = lang === 'ka' ? 'ka-GE' : 'en-GB'
  return new Date(isoDate).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}
