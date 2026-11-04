import Walls from './parts/Walls.jsx'
import Roof from './parts/Roof.jsx'
import Door from './parts/Door.jsx'
import Window from './parts/Window.jsx'
import Garden from './parts/Garden.jsx'
import Fence from './parts/Fence.jsx'
import Mailbox from './parts/Mailbox.jsx'
import Lantern from './parts/Lantern.jsx'
import GiftBow from './parts/GiftBow.jsx'
import GiftBox from './parts/GiftBox.jsx'
import { WALL_HEIGHT, FRONT_Z, GABLE_RISE } from './parts/dimensions.js'

const WINDOW_XS = [-1.25, 1.25]
const LANTERN_XS = [-0.65, 0.65]

// Builds a whole house from a design object (see src/data/design.js).
// signs: small calm signs of what's happening in the house. All optional, and all still, not moving:
//   giftBow     a big bow on the roof: nobody has claimed this gift yet
//   newLetter   the mailbox flag is up: a letter is waiting
//   capsuleGift a gift box at the door: the time capsule's day has come
export default function House({ design, signs }) {
  return (
    <group>
      <Walls color={design.wallColor} />
      <Roof style={design.roofStyle} color={design.roofColor} wallColor={design.wallColor} />
      <Door style={design.doorStyle} color={design.doorColor} />

      {WINDOW_XS.map((x) => (
        <Window key={x} style={design.windowStyle} color={design.windowColor} position={[x, 1.45, FRONT_Z + 0.03]} />
      ))}
      {/* A small attic window in the triangle of a pointed roof */}
      {design.roofStyle === 'gable' && (
        <Window
          style={design.windowStyle === 'shuttered' ? 'square' : design.windowStyle}
          color={design.windowStyle === 'shuttered' ? '#fff6e9' : design.windowColor}
          position={[0, WALL_HEIGHT + GABLE_RISE * 0.38, FRONT_Z + 0.03]}
          scale={0.6}
        />
      )}

      {LANTERN_XS.slice(0, design.lanterns).map((x) => (
        <Lantern key={x} x={x} />
      ))}

      <Garden kind={design.garden} />
      {design.fence && <Fence />}
      <Mailbox color={design.mailboxColor} flagUp={signs?.newLetter} />
      {signs?.giftBow && <GiftBow roofStyle={design.roofStyle} />}
      {signs?.capsuleGift && <GiftBox />}
    </group>
  )
}
