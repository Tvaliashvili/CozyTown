import { useEffect, useRef, useState } from 'react'

// Panels that open over the page (the mailbox, a photo, the lantern sheet...) and the phone's Back button.
//
// Opening a panel doesn't change the address, so on its own Back would skip the panel and leave the
// whole page. Instead, opening a panel adds a step to the browser history (same address, plus a note
// of how many panels deep we are: "overlayDepth"). Back takes that step out, and the panel closes.
// Closing a panel with its own button takes the step out too, so history stays in step with the screen.

// How deep each panel that's open right now is (1 = straight on the page, 2 = a panel inside a panel...).
const openDepths = new Set()

function currentDepth() {
  return window.history.state?.overlayDepth ?? 0
}

// A step can be left over with no open panel to match it: after leaving for another page and coming
// back with Back, or after reloading the page. Skip over it, or the next Back would seem to do nothing.
function skipLeftoverSteps() {
  const depth = currentDepth()
  if (depth === 0 || openDepths.has(depth)) return
  const below = [...openDepths].filter((d) => d < depth)
  window.history.go(Math.max(0, ...below) - depth)
}

window.addEventListener('popstate', skipLeftoverSteps)
skipLeftoverSteps()

// Works like useState, for a panel. `closed` is the value that means "not showing" (null, false, 'main'...).
// Setting anything else opens the panel; setting `closed` closes it.
export function useBackState(closed = null) {
  const [value, setValue] = useState(closed)
  const myDepth = useRef(0) // 0 = we haven't added a history step
  const isOpen = value !== closed

  // While open: if Back (or going to another page) takes us below our step, close.
  useEffect(() => {
    if (!isOpen) return
    const depth = myDepth.current
    openDepths.add(depth)
    function onBack() {
      if (currentDepth() < depth) {
        myDepth.current = 0
        setValue(closed)
      }
    }
    window.addEventListener('popstate', onBack)
    return () => {
      window.removeEventListener('popstate', onBack)
      openDepths.delete(depth)
    }
  }, [isOpen])

  function set(next) {
    if (next !== closed) {
      // Only the first time it opens; switching to another photo while open adds no step.
      if (!myDepth.current) {
        myDepth.current = currentDepth() + 1
        window.history.pushState({ ...window.history.state, overlayDepth: myDepth.current }, '')
      }
      setValue(next)
    } else if (myDepth.current) {
      const depth = myDepth.current
      myDepth.current = 0 // so a quick second tap on "close" doesn't go back twice
      // Our step is still the newest: take it out. The listener above then closes the panel.
      if (currentDepth() === depth) window.history.back()
      else setValue(closed)
    }
  }

  return [value, set]
}
