import { getMaterial } from '../materials.js'

const POST_COLOR = '#a9774f'
const FLAG_COLOR = '#e2735f'

// Stands by the sidewalk, outside the fence. flagUp: a letter is waiting.
export default function Mailbox({ color, flagUp = false }) {
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
      {flagUp ? (
        // Raised, on a tall thin pole, so it can be spotted from down the street.
        <>
          <mesh position={[0.17, 1.28, 0.14]} material={getMaterial(POST_COLOR)}>
            <boxGeometry args={[0.04, 0.6, 0.04]} />
          </mesh>
          <mesh position={[0.17, 1.46, -0.02]} material={getMaterial(FLAG_COLOR)}>
            <boxGeometry args={[0.05, 0.25, 0.3]} />
          </mesh>
        </>
      ) : (
        // Lowered: lying flat along the side of the box.
        <mesh position={[0.17, 0.98, 0.05]} material={getMaterial(FLAG_COLOR)}>
          <boxGeometry args={[0.03, 0.05, 0.22]} />
        </mesh>
      )}
    </group>
  )
}
