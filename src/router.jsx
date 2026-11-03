import { useEffect, useState } from 'react'

// A tiny router: the address bar decides which page shows.
// We only have a handful of pages, so no router library is needed.

// replace: swap the current history entry instead of adding one, so Back skips it.
// state: remembered with the entry (read it back with window.history.state).
export function navigate(path, { replace = false, state = null } = {}) {
  if (replace) window.history.replaceState(state, '', path)
  else window.history.pushState(state, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
  window.scrollTo(0, 0)
}

// The current path, e.g. "/signin". Updates when someone navigates or presses Back.
export function usePath() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const update = () => setPath(window.location.pathname)
    window.addEventListener('popstate', update)
    // A link tapped in the first instant, before this listener existed, changed the address
    // without anyone hearing it. Catch up once.
    update()
    return () => window.removeEventListener('popstate', update)
  }, [])
  return path
}

// Works like <a href>, but switches page without reloading the whole site.
// Ctrl/Cmd-click still opens a new tab, like a normal link.
export function Link({ to, ...props }) {
  function onClick(event) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return
    event.preventDefault()
    navigate(to)
  }
  return <a href={to} onClick={onClick} {...props} />
}
