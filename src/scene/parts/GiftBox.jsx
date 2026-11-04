import { getMaterial } from '../materials.js'
import { FOUNDATION_HEIGHT, FRONT_Z } from './dimensions.js'

const BOX = '#e2735f'
const RIBBON = '#f2c14e'

const SIZE = 0.44
// The top of the doorstep (see Door.jsx), a little to the side so the door stays clear.
const STEP_TOP = FOUNDATION_HEIGHT - 0.04
const POSITION = [0.32, STEP_TOP + SIZE / 2, FRONT_Z + 0.3]

// A wrapped gift on the doorstep: the time capsule's day has come.
export default function GiftBox() {
  const ribbon = getMaterial(RIBBON)

  return (
    <group position={POSITION} rotation-y={-0.2}>
      <mesh material={getMaterial(BOX)} castShadow>
        <boxGeometry args={[SIZE, SIZE, SIZE]} />
      </mesh>
      {/* Ribbon: one band each way, a hair bigger than the box so it sits on the surface */}
      <mesh material={ribbon}>
        <boxGeometry args={[SIZE + 0.01, SIZE + 0.01, 0.09]} />
      </mesh>
      <mesh material={ribbon}>
        <boxGeometry args={[0.09, SIZE + 0.01, SIZE + 0.01]} />
      </mesh>
      {/* A small bow on top */}
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * 0.09, SIZE / 2 + 0.05, 0]} rotation-z={side * 0.5} scale={[0.1, 0.05, 0.05]} material={ribbon}>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      ))}
    </group>
  )
}
