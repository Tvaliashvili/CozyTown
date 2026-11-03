import { getMaterial } from '../materials.js'
import { FRONT_Z } from './dimensions.js'

const METAL = '#3d3330'
const LIGHT = '#ffd27a'

// A small lantern hanging on the wall beside the door.
export default function Lantern({ x }) {
  const metal = getMaterial(METAL)

  return (
    <group position={[x, 2.0, FRONT_Z + 0.16]}>
      <mesh position={[0, 0.17, -0.09]} material={metal}>
        <boxGeometry args={[0.05, 0.05, 0.16]} />
      </mesh>
      <mesh position-y={0.2} material={metal}>
        <coneGeometry args={[0.15, 0.12, 4]} />
      </mesh>
      <mesh material={getMaterial(LIGHT, { glow: true })}>
        <boxGeometry args={[0.15, 0.24, 0.15]} />
      </mesh>
      <mesh position-y={-0.14} material={metal}>
        <boxGeometry args={[0.19, 0.05, 0.19]} />
      </mesh>
    </group>
  )
}
