import { useEffect, useRef, useState } from 'react'

// Tells a picture when it comes near the screen, so it only downloads if someone gets that far.
// (The browser's own loading="lazy" starts far too early for this, over a thousand pixels ahead.)
//   scrollerSelector: the scrolling area the element lives in, e.g. '.letters'
//   margin: how far ahead to start, like a CSS margin, e.g. '150px'
// Returns [ref, near]: put ref on the element; near turns true once and stays true.
export function useNearScreen(scrollerSelector, margin) {
  const element = useRef(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const watcher = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setNear(true)
          watcher.disconnect()
        }
      },
      { root: element.current.closest(scrollerSelector), rootMargin: margin },
    )
    watcher.observe(element.current)
    return () => watcher.disconnect()
  }, [])

  return [element, near]
}
