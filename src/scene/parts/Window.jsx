import { getMaterial } from '../materials.js'

// Warm light glowing from inside - the cozy part.
const GLASS_COLOR = '#ffe29a'
const LIGHT_FRAME = '#fff6e9'

// One window. With shutters the frame stays light and the shutters take the chosen color.
export default function Window({ style, color, position, scale = 1 }) {
  const frameColor = style === 'shuttered' ? LIGHT_FRAME : color
  const frame = getMaterial(frameColor)
  const round = style === 'round'
  const barLength = round ? 0.64 : 0.62

  return (
    <group position={position} scale={scale}>
      {round ? (
        <>
          <mesh rotation-x={Math.PI / 2} material={frame}>
            <cylinderGeometry args={[0.42, 0.42, 0.06, 14]} />
          </mesh>
          <mesh position-z={0.02} rotation-x={Math.PI / 2} material={getMaterial(GLASS_COLOR, { glow: true })}>
            <cylinderGeometry args={[0.32, 0.32, 0.06, 14]} />
          </mesh>
        </>
      ) : (
        <>
          <mesh material={frame}>
            <boxGeometry args={[0.8, 0.8, 0.06]} />
          </mesh>
          <mesh position-z={0.02} material={getMaterial(GLASS_COLOR, { glow: true })}>
            <boxGeometry args={[0.62, 0.62, 0.06]} />
          </mesh>
          <mesh position={[0, -0.44, 0.06]} material={frame}>
            <boxGeometry args={[0.92, 0.08, 0.16]} />
          </mesh>
        </>
      )}

      {/* Cross bars */}
      <mesh position-z={0.05} material={frame}>
        <boxGeometry args={[0.06, barLength, 0.04]} />
      </mesh>
      <mesh position-z={0.05} material={frame}>
        <boxGeometry args={[barLength, 0.06, 0.04]} />
      </mesh>

      {style === 'shuttered' &&
        [-1, 1].map((side) => (
          <mesh key={side} position={[side * 0.55, 0, 0.03]} material={getMaterial(color)}>
            <boxGeometry args={[0.28, 0.82, 0.05]} />
          </mesh>
        ))}
    </group>
  )
}
