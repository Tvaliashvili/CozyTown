// "3 November 2026", in the language the page is shown in.
export function formatDate(isoDate, lang) {
  const locale = lang === 'ka' ? 'ka-GE' : 'en-GB'
  return new Date(isoDate).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' })
}
