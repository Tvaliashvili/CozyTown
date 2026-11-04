import { supabase } from '../lib/supabase.js'
import { cleanDesign } from './design.js'

// The whole town: [{ slug, nameKa, nameEn, streets: [{ slug, nameKa, nameEn, open, plotCount, takenPlots }] }].
// A neighbourhood with no streets yet still comes back, with an empty list.
// Closed streets are included for the admin page; the map itself only shows the open ones.
export async function loadTownMap() {
  const { data, error } = await supabase.rpc('get_town_map')
  if (error) throw error

  const neighbourhoods = []
  for (const row of data) {
    let hood = neighbourhoods.find((each) => each.slug === row.neighbourhood_slug)
    if (!hood) {
      hood = { slug: row.neighbourhood_slug, nameKa: row.neighbourhood_ka, nameEn: row.neighbourhood_en, streets: [] }
      neighbourhoods.push(hood)
    }
    if (row.street_slug) {
      hood.streets.push({
        slug: row.street_slug,
        nameKa: row.street_ka,
        nameEn: row.street_en,
        open: row.street_open,
        plotCount: row.plot_count,
        takenPlots: row.taken_plots,
      })
    }
  }
  return neighbourhoods
}

// One open street as a stranger sees it: outsides only, with no way into any house.
// Returns null if there's no such street, or it hasn't opened yet.
export async function loadStreetOutsides(slug) {
  const { data: street, error } = await supabase
    .from('streets')
    .select('name_ka, name_en, is_open')
    .eq('slug', slug)
    .maybeSingle()
  if (error) throw error
  if (!street?.is_open) return null

  const { data: houses, error: housesError } = await supabase.rpc('get_street', { street_slug: slug })
  if (housesError) throw housesError

  const designs = {}
  const signs = {}
  for (const { plot, design, gift_bow } of houses) {
    designs[plot] = cleanDesign(design)
    signs[plot] = { giftBow: gift_bow }
  }
  return { nameKa: street.name_ka, nameEn: street.name_en, designs, signs }
}
