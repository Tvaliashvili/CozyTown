import { lazy, Suspense, useEffect, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import Street from './Street.jsx'
import CameraRig from './CameraRig.jsx'
import { setGlowIntensity } from './materials.js'
import { PLOT_XS } from './layout.js'

// Must match --horizon in styles.css so the far ground fades into the sky.
const HORIZON_COLOR = '#f6cfae'

// Add ?debug to the address to see the frames-per-second counter.
// Debug mode also redraws non-stop, so the counter shows the worst case.
const debug = new URLSearchParams(window.location.search).has('debug')
// Only downloaded in debug mode, so normal visitors don't pay for it.
const Stats = debug ? lazy(() => import('@react-three/drei').then((m) => ({ default: m.Stats }))) : null

// myPlot: which plot (counted from the left) is the house being shown.
// neighbours: { plotNumber: design } for the other houses; plots not listed are free.
// myLanterns: how many visitor lanterns glow in front of the house being shown.
// mySigns, neighbourSigns: small signs on the houses, see House.jsx. Neighbours: { plotNumber: signs }.
// editing: a panel covers part of the screen, so the camera frames the house in the space left.
// tallPanel: that panel is the tall lantern screen (see CameraRig).
export default function Town({ myPlot, myDesign, myLanterns, mySigns, neighbours, neighbourSigns, editing, tallPanel, onSelectMine, labelRef, onReady }) {
  return (
    <Canvas
      // "demand": only redraw when something changes, instead of 60 times a second.
      // The street is mostly still, so this saves a lot of battery and heat on phones.
      frameloop={debug ? 'always' : 'demand'}
      dpr={[1, 1.5]}
      shadows="percentage"
      flat // no film-style tone mapping: colors show up as picked, storybook-bright
      camera={{ fov: 45, position: [0, 10, 14] }}
      gl={{ alpha: true, antialias: true }}
      onCreated={({ gl }) => {
        // Shadows are only recalculated when something changes (see ShadowRefresher).
        gl.shadowMap.autoUpdate = false
        if (debug) window.__gl = gl
      }}
      style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
    >
      <fog attach="fog" args={[HORIZON_COLOR, 30, 70]} />

      {/* Early-evening light: a rosy fill from the dusk sky plus one low, warm sun that casts shadows.
          Kept bright on purpose so the house colors still read clearly. */}
      <hemisphereLight args={['#ffe6dc', '#6f8a5c', 1.5]} />
      <directionalLight
        position={[-12, 16, 12]}
        color="#ffc999"
        intensity={2.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
        shadow-camera-left={-36}
        shadow-camera-right={36}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
      />

      <Street
        myPlot={myPlot}
        myDesign={myDesign}
        myLanterns={myLanterns}
        mySigns={mySigns}
        neighbours={neighbours}
        neighbourSigns={neighbourSigns}
        onSelectMine={onSelectMine}
        labelRef={labelRef}
      />
      <CameraRig startX={PLOT_XS[myPlot]} focusX={editing ? PLOT_XS[myPlot] : null} tallPanel={tallPanel} />
      <ShadowRefresher design={myDesign} signs={mySigns} />
      <BreathingLights />
      <ReadySignal onReady={onReady} />
      {Stats && (
        <Suspense fallback={null}>
          <Stats />
        </Suspense>
      )}
    </Canvas>
  )
}

// Recalculates shadows once after the town appears and whenever your house changes,
// including when a sign that casts a shadow (the capsule's gift box) goes away.
function ShadowRefresher({ design, signs }) {
  const { gl, invalidate } = useThree()
  useEffect(() => {
    gl.shadowMap.needsUpdate = true
    invalidate()
  }, [gl, invalidate, design, signs])
  return null
}

// Lamps and windows gently brighten and dim, like candlelight.
// Runs at a low frame rate: slow glowing doesn't need 60 frames a second.
const BREATHING_FPS = 12

function BreathingLights() {
  const invalidate = useThree((state) => state.invalidate)
  useEffect(() => {
    const id = setInterval(() => {
      const t = performance.now() / 1000
      setGlowIntensity(1.4 + Math.sin(t * 1.6) * 0.12 + Math.sin(t * 4.1) * 0.05)
      invalidate()
    }, 1000 / BREATHING_FPS)
    return () => clearInterval(id)
  }, [invalidate])
  return null
}

// Tells the app when the first frames are on screen, so the loading screen can fade out.
function ReadySignal({ onReady }) {
  const frames = useRef(0)
  useFrame(() => {
    frames.current += 1
    if (frames.current === 2) onReady?.()
  })
  return null
}
