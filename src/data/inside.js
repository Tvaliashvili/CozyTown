import { supabase } from '../lib/supabase.js'

// Everything inside a house: photos on the walls and letters in the mailbox.
// Who may do what is decided by the database (supabase/migrations), not here:
//   photos  - anyone with the house link can see them; only the keeper hangs or removes them.
//   letters - only the keeper can read and write them.

// The photos on the walls, each with the address of its picture file.
export async function loadPhotos(code) {
  const { data, error } = await supabase.rpc('get_house_photos', { house_code: code })
  if (error) throw error
  return data.map(withUrl)
}

function withUrl(photo) {
  return { ...photo, url: supabase.storage.from('photos').getPublicUrl(photo.path).data.publicUrl }
}

// Photos and letters are stored by the house's id, not its code.
// Only the keeper can look the id up (the database hides other people's houses).
const houseIds = new Map()

export async function houseId(code) {
  if (!houseIds.has(code)) {
    const { data, error } = await supabase.from('houses').select('id').eq('code', code).single()
    if (error) throw error
    houseIds.set(code, data.id)
  }
  return houseIds.get(code)
}

// Uploads a shrunk photo (from shrinkPhoto) and hangs it in a frame.
// slot = which frame (0-4). Returns the new photo, ready to show.
export async function hangPhoto(code, { blob, width, height }, slot, caption) {
  const id = await houseId(code)
  const extension = blob.type === 'image/webp' ? 'webp' : 'jpg'
  // A long random name, so nobody can guess the photo's address.
  const path = `${id}/${crypto.randomUUID()}.${extension}`

  const { error: uploadError } = await supabase.storage.from('photos').upload(path, blob, { contentType: blob.type })
  if (uploadError) throw uploadError

  const { data, error } = await supabase
    .from('photos')
    .insert({ house_id: id, path, slot, width, height, caption: caption.trim() || null })
    .select('id, path, caption, slot, width, height')
    .single()
  if (error) {
    // Don't leave a file behind that no frame points to.
    await supabase.storage.from('photos').remove([path])
    throw error
  }
  return withUrl(data)
}

// Takes a photo off the wall and deletes its file.
export async function takeDownPhoto(photo) {
  const { error } = await supabase.from('photos').delete().eq('id', photo.id)
  if (error) throw error
  // If only this part fails, the photo is already gone from the wall; the file is just left over.
  await supabase.storage.from('photos').remove([photo.path])
}

// Newest letters first.
export async function loadLetters(code) {
  const id = await houseId(code)
  const { data, error } = await supabase
    .from('letters')
    .select('id, from_name, body, created_at')
    .eq('house_id', id)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function sendLetter(code, fromName, body) {
  const id = await houseId(code)
  const { data, error } = await supabase
    .from('letters')
    .insert({ house_id: id, from_name: fromName.trim() || null, body: body.trim() })
    .select('id, from_name, body, created_at')
    .single()
  if (error) throw error
  return data
}

export async function deleteLetter(letter) {
  const { error } = await supabase.from('letters').delete().eq('id', letter.id)
  if (error) throw error
}
