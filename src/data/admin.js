import { supabase } from '../lib/supabase.js'

// Everything the admin page (/admin) asks the database for.
// The database itself checks that the person asking is an admin (public.admins), so hiding
// the page from others is only for looks: nobody else gets any data back.

export async function checkIsAdmin() {
  const { data, error } = await supabase.rpc('is_admin')
  if (error) throw error
  return data === true
}

export async function loadStreets() {
  const { data, error } = await supabase.from('streets').select('slug, name_en, plot_count, is_open').order('created_at')
  if (error) throw error
  return data
}

// A new street starts closed: it isn't on the map until setStreetOpen().
export async function addStreet(neighbourhood, englishName, georgianName) {
  const { error } = await supabase.rpc('admin_add_street', {
    neighbourhood,
    english_name: englishName,
    georgian_name: georgianName,
  })
  if (error) throw error
}

// Closing only hides the street from the map. Houses on it keep working through their links.
export async function setStreetOpen(slug, open) {
  const { error } = await supabase.rpc('admin_set_street_open', { street_slug: slug, make_open: open })
  if (error) throw error
}

// To another free plot. Moving into a quiet neighbourhood makes the house quiet (no bow, no gift box).
export async function moveHouse(code, street, plot) {
  const { error } = await supabase.rpc('admin_move_house', { house_code: code, street_slug: street, plot_number: plot })
  if (error) throw error
}

// Every house, newest first, with its order and keeper. See admin_list_houses() in supabase/migrations.
export async function loadAllHouses() {
  const { data, error } = await supabase.rpc('admin_list_houses')
  if (error) throw error
  // Prices arrive as text ("49.00") so no money is lost to rounding; we only show them.
  return data.map((house) => ({ ...house, price_gel: house.price_gel === null ? null : Number(house.price_gel) }))
}

// Creates the house, saves the order and puts the buyer's letter in the mailbox, all at once.
// Returns { code, gift_code }.
export async function createOrder(order) {
  const { data, error } = await supabase.rpc('admin_create_order', {
    street_slug: order.street,
    plot_number: order.plot,
    house_title: order.title,
    start_design: order.design ?? {},
    buyer: order.buyer,
    contact: order.contact,
    price: order.price === '' ? null : Number(order.price),
    is_paid: order.paid,
    order_note: order.note,
    letter_from: order.letterFrom,
    letter_body: order.letterBody,
    quiet_house: order.quiet,
  })
  if (error) throw error
  return data[0]
}

// For a letter the buyer sends after ordering. The admin can't read letters back.
export async function addLetter(code, from, body) {
  const { error } = await supabase.rpc('admin_add_letter', { house_code: code, letter_from: from, letter_body: body })
  if (error) throw error
}

// e.g. setOrderPaid('ABCD234567', true) once the bank transfer arrives.
export async function setOrderPaid(code, paid) {
  const { data: house, error: houseError } = await supabase.from('houses').select('id').eq('code', code).single()
  if (houseError) throw houseError
  const { error } = await supabase.from('orders').update({ paid }).eq('house_id', house.id)
  if (error) throw error
}

// A memorial house: no gift bow and no gift box on the street, only quiet signs.
export async function setHouseQuiet(code, quiet) {
  const { error } = await supabase.rpc('admin_set_quiet', { house_code: code, make_quiet: quiet })
  if (error) throw error
}

// After the keeper pays 15 ₾ for a redesign: lets them change the outside again.
export async function unlockDesign(code) {
  const { error } = await supabase.rpc('admin_unlock_design', { house_code: code })
  if (error) throw error
}

// How much space all photo files take on Supabase: { bytes, files }.
export async function loadStorageUse() {
  const { data, error } = await supabase.rpc('admin_storage_use')
  if (error) throw error
  return data[0]
}

// The newest line from the nightly backup's diary (public.backup_runs), or null if there's none yet.
export async function loadLastBackup() {
  const { data, error } = await supabase
    .from('backup_runs')
    .select('finished_at, size_bytes, file_count, missing_files')
    .order('finished_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data[0] ?? null
}
