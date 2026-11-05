import { useEffect } from 'react'
import { useI18n } from '../i18n/i18n.jsx'
import { useBackState } from '../lib/useBackState.js'
import { CloseIcon, MenuIcon } from './icons.jsx'

// Top-bar buttons that tuck away behind a "sandwich" button on phones, where they don't fit in a row.
// On wider screens the sandwich is hidden and the buttons show in a row as usual (see styles.css),
// so the page needs only one set of buttons, with no checking of the screen size in code.
//
// itemsClassName: the class the row of buttons already has, like "top-bar-buttons".
// Text inside a <span className="menu-label"> shows only in the open menu, so an icon button
// can have words beside it there.
export default function PhoneMenu({ itemsClassName = '', children }) {
  const { t } = useI18n()
  // useBackState: the phone's Back button closes the menu, instead of leaving the page.
  const [open, setOpen] = useBackState(false)

  useEffect(() => {
    if (!open) return
    function onKey(event) {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  // Whatever is tapped inside the menu also closes it.
  function onItemTap(event) {
    if (!open) return
    const item = event.target.closest('a, button')
    if (!item) return
    // A jump within the page ("How it works") has to wait: closing steps back in history, which
    // would cancel the jump or scroll back to where it was.
    const jump = item.getAttribute('href')
    if (jump?.startsWith('#')) {
      event.preventDefault()
      window.addEventListener('popstate', () => {
        requestAnimationFrame(() => document.querySelector(jump)?.scrollIntoView())
      }, { once: true })
    }
    setOpen(false)
  }

  return (
    <div className={open ? 'phone-menu open' : 'phone-menu'}>
      <button
        type="button"
        className="pill-button phone-menu-button"
        aria-expanded={open}
        aria-label={t(open ? 'menu.close' : 'menu.open')}
        onClick={() => setOpen(!open)}
      >
        {open ? <CloseIcon /> : <MenuIcon />}
      </button>
      {/* A tap anywhere outside the menu closes it. Keyboards use Escape, so it stays out of the tab order. */}
      {open && <button type="button" className="phone-menu-backdrop" tabIndex={-1} aria-hidden="true" onClick={() => setOpen(false)} />}
      <div className={`phone-menu-items ${itemsClassName}`} onClick={onItemTap}>
        {children}
      </div>
    </div>
  )
}
