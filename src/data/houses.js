import { supabase } from '../lib/supabase.js'
import { cleanDesign } from './design.js'

// Everything the /h/<code> page needs: the house itself and the outsides of its neighbours.
// Returns null if no house has this code. Throws if the internet or the database failed.
export async function loadHouse(code) {
  const { data: rows, error } = await supabase.rpc('get_house', { house_code: code })
  if (error) throw error
  const house = rows[0]
  if (!house) return null

  const { data: street, error: streetError } = await supabase.rpc('get_street', { street_slug: house.street_slug })
  if (streetError) throw streetError

  // { plotNumber: design } for every other house on the street. Empty plots aren't listed.
  const neighbours = {}
  // The only sign strangers get: the database tells nobody else about a neighbour's letters or capsule.
  const neighbourSigns = {}
  let giftBow = false
  for (const { plot, design, gift_bow } of street) {
    if (plot === house.plot) {
      giftBow = gift_bow
    } else {
      neighbours[plot] = cleanDesign(design)
      neighbourSigns[plot] = { giftBow: gift_bow }
    }
  }

  return {
    code,
    plot: house.plot,
    title: house.title,
    design: cleanDesign(house.design),
    claimed: house.claimed,
    isKeeper: house.is_keeper,
    // Invited by the keeper to help: may hang photos, write letters and fill the time capsule.
    isHelper: house.is_helper,
    designFinal: house.design_final,
    // Only the number. Who lit them and what they wrote is for the keeper's eyes only.
    lanternCount: house.lantern_count,
    // Keeper only: the time capsule's day has come and they haven't looked inside yet.
    capsuleNews: house.capsule_news,
    // Small signs on the outside of the house, see src/scene/House.jsx.
    signs: { giftBow, newLetter: house.new_letter, capsuleGift: house.capsule_gift },
    neighbours,
    neighbourSigns,
  }
}

// Saves the keeper's work in progress. The database refuses it once the design is final.
export async function saveHouseDesign(code, design) {
  const { error } = await supabase.from('houses').update({ design }).eq('code', code)
  if (error) throw error
}

// Saves the finished outside and locks it. After this only the admin can unlock it (a paid redesign).
export async function submitHouseDesign(code, design) {
  const { error } = await supabase.rpc('submit_design', { house_code: code, final_design: design })
  if (error) throw error
}

// A visitor lights a lantern. No account needed; name and words are optional.
// The database allows 20 lanterns per house per hour (against spam). Past that the error
// gets tooMany = true, so the screen can say "try again later" instead of "check your internet".
export async function lightLantern(code, fromName, message) {
  const { error } = await supabase.rpc('light_lantern', {
    house_code: code,
    from_name: fromName.trim() || null,
    message: message.trim() || null,
  })
  if (error) {
    error.tooMany = error.message.includes('Too many lanterns')
    throw error
  }
}

// The keeper's own view of the lanterns: who lit them and what they wrote, newest first.
// Only the keeper gets anything back (the database hides lanterns from everyone else).
// seenUntil: the newest lantern the keeper has already looked at (empty if never). Anything newer is "new".
export const KEEPER_LANTERN_LIMIT = 100

export async function loadKeeperLanterns(code) {
  const { data, error } = await supabase
    .from('houses')
    .select('keeper_seen_at, lanterns(id, from_name, message, created_at)')
    .eq('code', code)
    .order('created_at', { referencedTable: 'lanterns', ascending: false })
    .limit(KEEPER_LANTERN_LIMIT, { referencedTable: 'lanterns' })
    .single()
  if (error) throw error
  return { lanterns: data.lanterns, seenUntil: data.keeper_seen_at }
}

export function isNewLantern(lantern, seenUntil) {
  return !seenUntil || Date.parse(lantern.created_at) > Date.parse(seenUntil)
}

// Remembers that the keeper has seen every lantern up to this one.
// We store the lantern's own time, not the phone's clock: a phone set to the wrong time
// would otherwise hide new lanterns or keep old ones "new" forever.
export async function markLanternsSeen(code, newestLantern) {
  const { error } = await supabase.from('houses').update({ keeper_seen_at: newestLantern.created_at }).eq('code', code)
  if (error) throw error
}

// The keeper has opened the mailbox: the flag goes down until the next letter arrives.
export async function markLettersSeen(code) {
  const { error } = await supabase.rpc('mark_letters_seen', { house_code: code })
  if (error) throw error
}

// The keeper takes away an unwanted lantern (anyone with the link can light one).
export async function removeLantern(lantern) {
  const { error } = await supabase.from('lanterns').delete().eq('id', lantern.id)
  if (error) throw error
}

// What the printable card needs. Only the keeper and admins can see a house this way,
// so it returns null for anyone else (or when signed out).
// giftCode is only filled in while nobody has claimed the house yet; after that it's used up.
export async function loadCardInfo(code) {
  // Signed out, the database refuses outright (an error, not an empty answer), so don't even ask.
  const { data: auth } = await supabase.auth.getSession()
  if (!auth.session) return null

  const { data, error } = await supabase
    .from('houses')
    .select('title, gift_code, keeper_id')
    .eq('code', code)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  return { title: data.title, giftCode: data.keeper_id ? null : data.gift_code }
}
