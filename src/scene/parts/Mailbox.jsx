import { getMaterial } from '../materials.js'

const POST_COLOR = '#a9774f'
const FLAG_COLOR = '#f2c14e'

// Stands by the sidewalk, outside the fence. In Phase 2 this is where letters arrive.
export default function Mailbox({ color }) {
  return (
    <group position={[0.85, 0, 3.05]}>
      <mesh position-y={0.45} material={getMaterial(POST_COLOR)}>
        <boxGeometry args={[0.08, 0.9, 0.08]} />
      </mesh>
      <mesh position-y={0.98} material={getMaterial(color)} castShadow>
        <boxGeometry args={[0.3, 0.2, 0.45]} />
      </mesh>
      {/* Rounded lid */}
      <mesh position-y={1.08} rotation-x={Math.PI / 2} material={getMaterial(color)}>
        <cylinderGeometry args={[0.15, 0.15, 0.45, 10, 1, false, Math.PI / 2, Math.PI]} />
      </mesh>
      <mesh position={[0.17, 1.12, 0.05]} material={getMaterial(FLAG_COLOR)}>
        <boxGeometry args={[0.03, 0.22, 0.12]} />
      </mesh>
    </group>
  )
}
