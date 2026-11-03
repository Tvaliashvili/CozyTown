import { getMaterial } from '../materials.js'
import { WALL_WIDTH, WALL_DEPTH, WALL_HEIGHT, FOUNDATION_HEIGHT, HOUSE_Z } from './dimensions.js'

const FOUNDATION_COLOR = '#b9a68c'

export default function Walls({ color }) {
  return (
    <group position={[0, 0, HOUSE_Z]}>
      <mesh position={[0, FOUNDATION_HEIGHT / 2, 0]} material={getMaterial(FOUNDATION_COLOR)} receiveShadow>
        <boxGeometry args={[WALL_WIDTH + 0.2, FOUNDATION_HEIGHT, WALL_DEPTH + 0.2]} />
      </mesh>
      <mesh position={[0, WALL_HEIGHT / 2, 0]} material={getMaterial(color)} castShadow receiveShadow>
        <boxGeometry args={[WALL_WIDTH, WALL_HEIGHT, WALL_DEPTH]} />
      </mesh>
    </group>
  )
}
