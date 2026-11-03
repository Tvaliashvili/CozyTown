import { getMaterial } from '../materials.js'

const SOIL = '#8a6446'
const GREENS = ['#5f9a48', '#6fae55']
const FLOWER_COLORS = ['#f7a8b8', '#fff3b0', '#ffffff', '#f28c8c', '#c9a0e8']
const PUMPKIN = '#e8913a'

// Two flower beds, one each side of the path. Each entry: [x, z]
const BEDS = [
  [-1.55, 1.75],
  [1.55, 1.75],
]
// Spots inside a bed, hand-placed so they don't look like a grid.
const SPOTS = [
  [-0.5, -0.22], [0, -0.28], [0.5, -0.18], [-0.3, 0.2], [0.22, 0.24], [0.56, 0.16],
]

export default function Garden({ kind }) {
  if (kind === 'none') return null

  return BEDS.map(([x, z], bedIndex) => (
    <group key={bedIndex} position={[x, 0, z]}>
      {kind === 'hedge' ? (
        [-0.5, 0, 0.5].map((dx, i) => (
          <mesh key={dx} position={[dx, 0.32, 0]} scale={[0.42, 0.38, 0.4]} material={getMaterial(GREENS[i % 2])} castShadow>
            <icosahedronGeometry args={[1, 0]} />
          </mesh>
        ))
      ) : (
        <>
          <mesh position-y={0.08} material={getMaterial(SOIL)} receiveShadow>
            <boxGeometry args={[1.5, 0.12, 0.9]} />
          </mesh>
          {kind === 'flowers' && <Flowers offset={bedIndex} />}
          {kind === 'vegetables' && <Vegetables />}
        </>
      )}
    </group>
  ))
}

function Flowers({ offset }) {
  return (
    <>
      <mesh position-y={0.18} scale={[0.68, 0.14, 0.38]} material={getMaterial(GREENS[0])}>
        <icosahedronGeometry args={[1, 0]} />
      </mesh>
      {SPOTS.map(([x, z], i) => (
        <mesh
          key={i}
          position={[x, 0.32, z]}
          material={getMaterial(FLOWER_COLORS[(i + offset * 2) % FLOWER_COLORS.length])}
        >
          <icosahedronGeometry args={[0.12, 0]} />
        </mesh>
      ))}
    </>
  )
}

function Vegetables() {
  return SPOTS.map(([x, z], i) =>
    i % 2 === 0 ? (
      <mesh key={i} position={[x, 0.24, z]} scale={[1, 0.75, 1]} material={getMaterial(PUMPKIN)}>
        <icosahedronGeometry args={[0.16, 0]} />
      </mesh>
    ) : (
      <mesh key={i} position={[x, 0.3, z]} material={getMaterial(GREENS[1])}>
        <coneGeometry args={[0.13, 0.32, 5]} />
      </mesh>
    ),
  )
}
