import { useLayoutEffect, useRef } from 'react'
import { Object3D } from 'three'
import { useThree } from '@react-three/fiber'
import { getMaterial } from '../materials.js'

const METAL = '#3d3330'
const LIGHT = '#ffe08a'

// Lanterns that visitors lit, on short posts in the front garden so they rise above the fence.
// Hand-placed, lining the path first, so they look the same on every visit. Each entry: [x, z]
const SPOTS = [
  [-0.55, 2.15], [0.55, 2.15], [-0.55, 1.3], [0.55, 1.3],
  [-1.5, 2.3], [1.5, 2.3], [-2.4, 2.3], [2.4, 2.3],
  [-2.4, 1.2], [2.4, 1.2], [-2.4, 0.1], [2.4, 0.1],
]
// After 12 the garden is full; the "Light a lantern" screen still says the real number.

const LAWN_TOP = 0.06
const POST_HEIGHT = 0.6
const BODY_HEIGHT = 0.3
// Where the middle of each piece sits, stacked from the lawn up: post, glowing body, cap.
const POST_Y = LAWN_TOP + POST_HEIGHT / 2
const BODY_Y = LAWN_TOP + POST_HEIGHT + BODY_HEIGHT / 2
const CAP_Y = LAWN_TOP + POST_HEIGHT + BODY_HEIGHT + 0.05

// All lanterns share one shape, so they're drawn as "instances": 3 draw calls in total
// (posts, bodies, caps) however many there are. Separate meshes would cost 3 per lantern.
export default function GardenLanterns({ count }) {
  const shown = Math.min(count, SPOTS.length)
  const posts = useRef(null)
  const bodies = useRef(null)
  const caps = useRef(null)
  const invalidate = useThree((state) => state.invalidate)

  // Put each instance in its spot.
  useLayoutEffect(() => {
    if (shown === 0) return
    const place = new Object3D()
    SPOTS.slice(0, shown).forEach(([x, z], i) => {
      for (const [mesh, y] of [[posts, POST_Y], [bodies, BODY_Y], [caps, CAP_Y]]) {
        place.position.set(x, y, z)
        place.updateMatrix()
        mesh.current.setMatrixAt(i, place.matrix)
      }
    })
    for (const mesh of [posts, bodies, caps]) mesh.current.instanceMatrix.needsUpdate = true
    invalidate() // the canvas only redraws when asked (see Town.jsx)
  }, [shown, invalidate])

  if (shown === 0) return null

  // key: the number of instances is fixed when created, so a new lantern means new instances.
  return (
    <group key={shown}>
      <instancedMesh ref={posts} args={[undefined, undefined, shown]} material={getMaterial(METAL)}>
        <cylinderGeometry args={[0.03, 0.04, POST_HEIGHT, 5]} />
      </instancedMesh>
      <instancedMesh ref={bodies} args={[undefined, undefined, shown]} material={getMaterial(LIGHT, { glow: true })}>
        <cylinderGeometry args={[0.13, 0.13, BODY_HEIGHT, 6]} />
      </instancedMesh>
      <instancedMesh ref={caps} args={[undefined, undefined, shown]} material={getMaterial(METAL)}>
        <coneGeometry args={[0.17, 0.1, 6]} />
      </instancedMesh>
    </group>
  )
}
