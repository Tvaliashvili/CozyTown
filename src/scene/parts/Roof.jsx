import { ExtrudeGeometry, Shape, Vector2 } from 'three'
import { getMaterial } from '../materials.js'
import { WALL_WIDTH, WALL_DEPTH, WALL_HEIGHT, HOUSE_Z, ROOF_PITCH, GABLE_RISE } from './dimensions.js'

const OVERHANG = 0.3 // how far the roof sticks out past the walls
const SLAB_THICKNESS = 0.16
const CHIMNEY_COLOR = '#b5654a'

// The triangle of wall under a pointed roof. Built once and shared by every house.
const halfWidth = WALL_WIDTH / 2
const gableGeometry = new ExtrudeGeometry(
  new Shape([new Vector2(-halfWidth, 0), new Vector2(halfWidth, 0), new Vector2(0, GABLE_RISE)]),
  { depth: WALL_DEPTH, bevelEnabled: false },
)
gableGeometry.translate(0, 0, -WALL_DEPTH / 2)

export default function Roof({ style, color, wallColor }) {
  return (
    <group position={[0, WALL_HEIGHT, HOUSE_Z]}>
      {style === 'gable' && <GableRoof color={color} wallColor={wallColor} />}
      {style === 'hip' && <HipRoof color={color} />}
      {style === 'flat' && <FlatRoof color={color} />}
    </group>
  )
}

function GableRoof({ color, wallColor }) {
  const slabHalf = halfWidth + OVERHANG
  const slabLength = slabHalf / Math.cos(ROOF_PITCH)
  const slabDepth = WALL_DEPTH + OVERHANG * 2

  return (
    <>
      <mesh geometry={gableGeometry} material={getMaterial(wallColor)} castShadow />
      {/* Two sloped slabs meeting at the top */}
      {[-1, 1].map((side) => (
        <mesh
          key={side}
          position={[
            side * (slabHalf / 2) - side * Math.sin(ROOF_PITCH) * (SLAB_THICKNESS / 2),
            GABLE_RISE - (slabHalf / 2) * Math.tan(ROOF_PITCH) + Math.cos(ROOF_PITCH) * (SLAB_THICKNESS / 2),
            0,
          ]}
          rotation-z={-side * ROOF_PITCH}
          material={getMaterial(color)}
          castShadow
        >
          <boxGeometry args={[slabLength, SLAB_THICKNESS, slabDepth]} />
        </mesh>
      ))}
      {/* Ridge cap hides the seam at the top */}
      <mesh position={[0, GABLE_RISE + 0.1, 0]} rotation-z={Math.PI / 4} material={getMaterial(color)}>
        <boxGeometry args={[0.2, 0.2, slabDepth]} />
      </mesh>
      <Chimney bottom={GABLE_RISE * 0.3} top={GABLE_RISE + 0.35} />
    </>
  )
}

function HipRoof({ color }) {
  const height = 1.3
  // A 4-sided cone turned 45° is a pyramid; scaling stretches it to fit the rectangle.
  return (
    <>
      <group scale={[(WALL_WIDTH + OVERHANG * 2) / Math.SQRT2, height, (WALL_DEPTH + OVERHANG * 2) / Math.SQRT2]}>
        <mesh position-y={0.5} rotation-y={Math.PI / 4} material={getMaterial(color)} castShadow>
          <coneGeometry args={[1, 1, 4]} />
        </mesh>
      </group>
      <Chimney bottom={0.3} top={height * 0.75} />
    </>
  )
}

function FlatRoof({ color }) {
  return (
    <>
      <mesh position-y={0.1} material={getMaterial(color)} castShadow>
        <boxGeometry args={[WALL_WIDTH + OVERHANG, 0.2, WALL_DEPTH + OVERHANG]} />
      </mesh>
      <Chimney bottom={0.2} top={0.75} />
    </>
  )
}

function Chimney({ bottom, top }) {
  const height = top - bottom
  return (
    <mesh position={[0.95, bottom + height / 2, -0.5]} material={getMaterial(CHIMNEY_COLOR)} castShadow>
      <boxGeometry args={[0.45, height, 0.45]} />
    </mesh>
  )
}
