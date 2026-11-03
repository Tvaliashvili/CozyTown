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
  for (const { plot, design } of street) {
    if (plot !== house.plot) neighbours[plot] = cleanDesign(design)
  }

  return {
    code,
    plot: house.plot,
    title: house.title,
    design: cleanDesign(house.design),
    claimed: house.claimed,
    isKeeper: house.is_keeper,
    designFinal: house.design_final,
    neighbours,
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
