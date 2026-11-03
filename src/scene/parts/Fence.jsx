import { getMaterial } from '../materials.js'
import { FENCE_Z } from './dimensions.js'

const FENCE_COLOR = '#fffaf0'
const PICKET_XS = [0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4]

// A low picket fence along the front, with a gap for the path.
export default function Fence() {
  const material = getMaterial(FENCE_COLOR)

  return (
    <group position-z={FENCE_Z}>
      {[-1, 1].map((side) => (
        <group key={side} scale-x={side}>
          {PICKET_XS.map((x) => (
            <mesh key={x} position={[x, 0.35, 0]} material={material}>
              <boxGeometry args={[0.12, 0.7, 0.06]} />
            </mesh>
          ))}
          {[0.25, 0.52].map((y) => (
            <mesh key={y} position={[1.5, y, -0.05]} material={material}>
              <boxGeometry args={[2, 0.07, 0.04]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}
