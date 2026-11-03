import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'

// Keeps a normal HTML element (target) stuck to a point in the 3D world, every frame.
// The element itself lives outside the 3D canvas, in App.jsx.
export default function ScreenAnchor({ target, position }) {
  const anchor = useRef(null)
  const point = useMemo(() => new Vector3(), [])

  useFrame(({ camera, size }) => {
    const el = target.current
    if (!el || !anchor.current) return
    anchor.current.getWorldPosition(point).project(camera)
    const x = ((point.x + 1) / 2) * size.width
    const y = ((1 - point.y) / 2) * size.height
    el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`
  })

  return <object3D ref={anchor} position={position} />
}
