import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import { PLOT_XS, PLOT_Z, STREET_START, STREET_END } from './layout.js'

// Camera sits in front of the street, a bit above, and only slides left/right.
// No free spinning: it should be impossible to get "lost".
const STREET_LOOK_HEIGHT = 1.2

// Must match the side-panel rule in styles.css (min-width: 900px, landscape)
// and the panel's width plus its gap from the screen edge.
const SIDE_PANEL_MIN_SCREEN = 900
const SIDE_PANEL_SPACE = 432

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

// focusX: when set, the camera glides close to the house at that X (for decorating)
// and dragging is switched off. When null, you can slide along the street.
export default function CameraRig({ focusX = null }) {
  const { camera, gl, size, invalidate } = useThree()
  // Start in front of a plot near the middle, not between two plots.
  const targetX = useRef(PLOT_XS[3])
  // How many world units one pixel of finger movement is worth, so the street follows the finger.
  const unitsPerPixel = useRef(0.05)
  const focused = useRef(false)
  const goal = useRef(new Vector3())
  const look = useRef(new Vector3(PLOT_XS[3], STREET_LOOK_HEIGHT, PLOT_Z + 1))
  const lookGoal = useRef(new Vector3())

  focused.current = focusX !== null
  if (focusX !== null) targetX.current = focusX // so "back to street" returns to this house

  // The town only redraws on request, so ask for a frame whenever the camera has somewhere to go.
  useEffect(() => {
    invalidate()
  }, [focusX, invalidate])

  useEffect(() => {
    const el = gl.domElement
    let lastX = null

    function onDown(e) {
      lastX = e.clientX
    }
    function onMove(e) {
      if (lastX === null || focused.current) return
      const dx = e.clientX - lastX
      lastX = e.clientX
      targetX.current = clamp(targetX.current - dx * unitsPerPixel.current, STREET_START, STREET_END)
      invalidate()
    }
    function onUp() {
      lastX = null
    }

    el.addEventListener('pointerdown', onDown)
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [gl, invalidate])

  useFrame((_, delta) => {
    const portrait = size.width < size.height
    const fovRadians = (camera.fov * Math.PI) / 180
    let distance, lookHeight
    let shiftX = 0

    if (!focused.current) {
      // Portrait phones are narrow, so step back further to fit a whole house on screen.
      distance = portrait ? 22 : 15
      lookHeight = STREET_LOOK_HEIGHT
    } else if (!portrait && size.width >= SIDE_PANEL_MIN_SCREEN) {
      // Panel on the right: come close and slide the view so the house sits in the free space on the left.
      distance = 10
      lookHeight = 1.8
      const panelShare = SIDE_PANEL_SPACE / size.width
      const halfVisibleWidth = distance * Math.tan(fovRadians / 2) * (size.width / size.height)
      shiftX = panelShare * halfVisibleWidth
    } else {
      // Panel at the bottom: aim low so the whole house, roof included, sits in the top half.
      distance = 18
      lookHeight = -0.7
    }

    const viewX = targetX.current + shiftX
    goal.current.set(viewX, distance * 0.28 + 1.5, PLOT_Z + distance)
    lookGoal.current.set(viewX, lookHeight, PLOT_Z + 1)

    // Ease towards the goal instead of jumping, so movement feels soft.
    const ease = 1 - Math.exp(-delta * 5)
    camera.position.lerp(goal.current, ease)
    look.current.lerp(lookGoal.current, ease)
    camera.lookAt(look.current)

    // Keep drawing until the camera has (almost) arrived.
    const stillMoving =
      camera.position.distanceToSquared(goal.current) > 1e-5 || look.current.distanceToSquared(lookGoal.current) > 1e-5
    if (stillMoving) invalidate()

    unitsPerPixel.current = (2 * distance * Math.tan(fovRadians / 2)) / size.height
  })

  return null
}
