import { getMaterial } from './materials.js'
import { PLOT_XS, PLOT_WIDTH, SIDEWALK_Z, ROAD_Z, STREET_LENGTH } from './layout.js'
import Plot from './Plot.jsx'

const COLORS = {
  grass: '#9dc96b',
  road: '#d9c3a0',
  sidewalk: '#f0e2c8',
  trunk: '#8a5a3a',
  leaves: ['#6aa84f', '#7dbb5a', '#8cc66a'],
  hill: '#8fbf68',
  farHill: '#a9c98a',
  post: '#4a3b33',
  lamp: '#ffd27a',
}

// Hand-placed, not random, so the town looks the same on every visit.
// Each entry: [x, z, size]
const TREES = [
  [-29, -12, 1.2], [-22, -13, 1], [-17, -11, 1.3], [-11, -13.5, 0.9], [-6, -11.5, 1.1],
  [1, -13, 1.25], [7, -11, 1], [12, -13.5, 1.15], [18, -11.5, 0.95], [23, -13, 1.3],
  [29, -11.5, 1.05], [-31, -4, 1.1], [31, -5, 1.2], [-33, 3, 0.9], [33, 2, 1],
]
const BUSHES = [
  [-26, 6.8, 0.6], [-19, 7, 0.5], [-13, 6.7, 0.7], [-5, 7, 0.55], [2, 6.8, 0.65],
  [9, 7, 0.5], [15, 6.7, 0.6], [22, 7, 0.7], [28, 6.8, 0.55],
]
// Each entry: [x, z, width, height, depth, color]
const HILLS = [
  [-30, -42, 34, 5, 14, COLORS.farHill],
  [6, -48, 44, 7, 16, COLORS.farHill],
  [36, -40, 30, 4.5, 12, COLORS.farHill],
  [-12, -30, 26, 3, 10, COLORS.hill],
  [22, -30, 24, 2.5, 9, COLORS.hill],
]

export default function Street({ myPlot, myDesign, myLanterns, neighbours, onSelectMine, labelRef }) {
  return (
    <group>
      {/* Grass everywhere */}
      <mesh rotation-x={-Math.PI / 2} material={getMaterial(COLORS.grass)} receiveShadow>
        <planeGeometry args={[200, 200]} />
      </mesh>

      {/* Road and the two sidewalks */}
      <mesh position={[0, 0.02, ROAD_Z]} material={getMaterial(COLORS.road)} receiveShadow>
        <boxGeometry args={[STREET_LENGTH, 0.04, 3.6]} />
      </mesh>
      <mesh position={[0, 0.06, SIDEWALK_Z]} material={getMaterial(COLORS.sidewalk)} receiveShadow>
        <boxGeometry args={[STREET_LENGTH, 0.12, 1.6]} />
      </mesh>
      <mesh position={[0, 0.06, ROAD_Z + 2.4]} material={getMaterial(COLORS.sidewalk)} receiveShadow>
        <boxGeometry args={[STREET_LENGTH, 0.12, 1.2]} />
      </mesh>

      {PLOT_XS.map((x, i) =>
        i === myPlot ? (
          <Plot key={x} x={x} design={myDesign} onSelect={onSelectMine} labelRef={labelRef} lanterns={myLanterns} />
        ) : (
          <Plot key={x} x={x} design={neighbours[i]} />
        ),
      )}

      {/* A lamppost between every two plots */}
      {PLOT_XS.slice(0, -1).map((x) => (
        <Lamppost key={x} position={[x + PLOT_WIDTH / 2, 0.12, SIDEWALK_Z - 0.55]} />
      ))}

      {TREES.map(([x, z, size], i) => (
        <Tree key={i} position={[x, 0, z]} size={size} color={COLORS.leaves[i % COLORS.leaves.length]} />
      ))}
      {BUSHES.map(([x, z, size], i) => (
        <mesh key={i} position={[x, size * 0.6, z]} scale={size} material={getMaterial(COLORS.leaves[i % 3])} castShadow>
          <icosahedronGeometry args={[1, 0]} />
        </mesh>
      ))}

      {/* Soft hills in the distance; the fog fades them into the sky */}
      {HILLS.map(([x, z, w, h, d, color], i) => (
        <mesh key={i} position={[x, 0, z]} scale={[w, h, d]} material={getMaterial(color)}>
          <sphereGeometry args={[1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      ))}
    </group>
  )
}

function Tree({ position, size, color }) {
  return (
    <group position={position} scale={size}>
      <mesh position={[0, 0.7, 0]} material={getMaterial(COLORS.trunk)} castShadow>
        <cylinderGeometry args={[0.15, 0.22, 1.4, 6]} />
      </mesh>
      <mesh position={[0, 2.1, 0]} material={getMaterial(color)} castShadow>
        <icosahedronGeometry args={[1.1, 0]} />
      </mesh>
      <mesh position={[0.35, 2.85, 0.1]} material={getMaterial(color)} castShadow>
        <icosahedronGeometry args={[0.7, 0]} />
      </mesh>
    </group>
  )
}

function Lamppost({ position }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.3, 0]} material={getMaterial(COLORS.post)} castShadow>
        <cylinderGeometry args={[0.06, 0.09, 2.6, 6]} />
      </mesh>
      <mesh position={[0, 2.72, 0]} material={getMaterial(COLORS.lamp, { glow: true })}>
        <icosahedronGeometry args={[0.2, 1]} />
      </mesh>
      <mesh position={[0, 2.97, 0]} material={getMaterial(COLORS.post)}>
        <coneGeometry args={[0.3, 0.26, 6]} />
      </mesh>
    </group>
  )
}
