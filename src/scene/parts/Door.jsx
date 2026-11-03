import { getMaterial } from '../materials.js'
import { FOUNDATION_HEIGHT, FRONT_Z } from './dimensions.js'

const STEP_COLOR = '#d8c8ae'
const KNOB_COLOR = '#e8c15a'
const DOOR_WIDTH = 0.85

export default function Door({ style, color }) {
  return (
    <group position={[0, FOUNDATION_HEIGHT, FRONT_Z + 0.03]}>
      <mesh position={[0, -0.14, 0.25]} material={getMaterial(STEP_COLOR)} receiveShadow>
        <boxGeometry args={[1.15, 0.2, 0.5]} />
      </mesh>

      {style === 'arched' ? (
        <>
          <mesh position-y={0.55} material={getMaterial(color)}>
            <boxGeometry args={[DOOR_WIDTH, 1.1, 0.08]} />
          </mesh>
          {/* Half a cylinder makes the rounded top */}
          <mesh position-y={1.1} rotation-x={Math.PI / 2} material={getMaterial(color)}>
            <cylinderGeometry args={[DOOR_WIDTH / 2, DOOR_WIDTH / 2, 0.08, 12, 1, false, Math.PI / 2, Math.PI]} />
          </mesh>
        </>
      ) : (
        <mesh position-y={0.7} material={getMaterial(color)}>
          <boxGeometry args={[DOOR_WIDTH, 1.4, 0.08]} />
        </mesh>
      )}

      <mesh position={[0.26, 0.65, 0.06]} material={getMaterial(KNOB_COLOR)}>
        <icosahedronGeometry args={[0.05, 0]} />
      </mesh>
    </group>
  )
}
