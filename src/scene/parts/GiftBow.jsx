import { getMaterial } from '../materials.js'
import { WALL_HEIGHT, GABLE_RISE, HOUSE_Z } from './dimensions.js'

const RIBBON = '#e2735f'
const KNOT = '#c9574a'

// How high the top of each roof is (see Roof.jsx), so the bow sits on it, not inside it.
const ROOF_TOP = {
  gable: WALL_HEIGHT + GABLE_RISE + 0.2,
  hip: WALL_HEIGHT + 1.3,
  flat: WALL_HEIGHT + 0.2,
}

// A big bow on the roof: this house is a gift nobody has claimed yet.
// It's still, like everything on the street, so it costs nothing after the first drawing.
export default function GiftBow({ roofStyle }) {
  const ribbon = getMaterial(RIBBON)

  return (
    <group position={[0, ROOF_TOP[roofStyle] + 0.34, HOUSE_Z + 0.1]}>
      {/* The two loops, flattened balls tilted upwards */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.42, 0.08, 0]} rotation-z={side * 0.42} scale={[0.46, 0.27, 0.13]} material={ribbon}>
          <icosahedronGeometry args={[1, 1]} />
        </mesh>
      ))}
      {/* The two ends hanging down */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.2, -0.27, 0]} rotation-z={side * 0.42} material={ribbon}>
          <boxGeometry args={[0.15, 0.46, 0.05]} />
        </mesh>
      ))}
      <mesh position-z={0.05} scale={[0.15, 0.15, 0.12]} material={getMaterial(KNOT)}>
        <icosahedronGeometry args={[1, 0]} />
      </mesh>
    </group>
  )
}
