import { getMaterial } from './materials.js'
import { PLOT_WIDTH, PLOT_Z } from './layout.js'
import { WALL_HEIGHT, GABLE_RISE, HOUSE_Z } from './parts/dimensions.js'
import House from './House.jsx'
import GardenLanterns from './parts/GardenLanterns.jsx'
import ScreenAnchor from './ScreenAnchor.jsx'

const COLORS = {
  lawn: '#acd47c',
  stone: '#e2d3bb',
  wood: '#a9774f',
  board: '#f3e2c4',
  heart: '#e2735f',
}

// If the finger moved more than this many pixels, it was a drag along the street, not a tap.
const TAP_TOLERANCE = 10

// One plot: a lawn and a stone path, plus either a house or a "free plot" sign.
// onSelect makes the house tappable; labelRef pins an HTML label (from App.jsx) above the roof.
// lanterns: how many visitor lanterns glow on the lawn (only known for the house being shown).
export default function Plot({ x, design, onSelect, labelRef, lanterns = 0 }) {
  function handleClick(event) {
    if (!onSelect || event.delta > TAP_TOLERANCE) return
    event.stopPropagation()
    onSelect()
  }

  function setPointerCursor(on) {
    if (onSelect) document.body.style.cursor = on ? 'pointer' : ''
  }

  return (
    <group position={[x, 0, PLOT_Z]}>
      <mesh position={[0, 0.03, 0]} material={getMaterial(COLORS.lawn)} receiveShadow>
        <boxGeometry args={[PLOT_WIDTH - 0.6, 0.06, 5.4]} />
      </mesh>

      {[1.0, 1.8, 2.55].map((z) => (
        <mesh key={z} position={[0, 0.07, z]} material={getMaterial(COLORS.stone)} receiveShadow>
          <cylinderGeometry args={[0.32, 0.32, 0.04, 7]} />
        </mesh>
      ))}

      {design ? (
        <group
          onClick={handleClick}
          onPointerOver={() => setPointerCursor(true)}
          onPointerOut={() => setPointerCursor(false)}
        >
          <House design={design} />
        </group>
      ) : (
        <FreeSign />
      )}

      <GardenLanterns count={lanterns} />

      {labelRef && <ScreenAnchor target={labelRef} position={[0, WALL_HEIGHT + GABLE_RISE + 1.1, HOUSE_Z]} />}
    </group>
  )
}

// "Free plot" sign: a post, a board and a small heart.
function FreeSign() {
  return (
    <group position={[1.3, 0, 1.7]} rotation-y={-0.25}>
      <mesh position={[0, 0.5, 0]} material={getMaterial(COLORS.wood)} castShadow>
        <boxGeometry args={[0.1, 1, 0.1]} />
      </mesh>
      <mesh position={[0, 1.05, 0.06]} material={getMaterial(COLORS.board)} castShadow>
        <boxGeometry args={[0.9, 0.55, 0.06]} />
      </mesh>
      <mesh position={[0, 1.05, 0.1]} rotation-x={Math.PI / 2} material={getMaterial(COLORS.heart)}>
        <cylinderGeometry args={[0.13, 0.13, 0.03, 12]} />
      </mesh>
    </group>
  )
}
