import { supabase } from '../lib/supabase.js'
import { makeSmallCopy } from '../lib/shrinkPhoto.js'

// Everything inside a house: photos and letters.
// Who may do what is decided by the database (supabase/migrations), not here:
//   photos  - anyone with the house link can see them; only the keeper and helpers add or remove them.
//   letters - only the keeper can read and write them.

// How many photos a house holds, frames included. The database refuses more
// (supabase/migrations/20261111000000_photo_album.sql); this number is only for saying so nicely.
export const PHOTO_LIMIT = 30

// Every photo in the house, each with the address of its picture file.
// slot: which frame it hangs in, or null when it's only in the album.
export async function loadPhotos(code) {
  const { data, error } = await supabase.rpc('get_house_photos', { house_code: code })
  if (error) throw error
  return data.map(withUrl)
}

// The order the album shows: the frames first, then the rest as they came.
export function inAlbumOrder(photos) {
  return [...photos].sort((a, b) => (a.slot ?? 99) - (b.slot ?? 99))
}

// url: the full photo, for when it's opened. smallUrl: the small copy, for the frames.
// Photos hung before small copies existed have none, so they show the full photo everywhere.
function withUrl(photo) {
  const addressOf = (path) => supabase.storage.from('photos').getPublicUrl(path).data.publicUrl
  const url = addressOf(photo.path)
  return { ...photo, url, smallUrl: photo.small_path ? addressOf(photo.small_path) : url }
}

function extensionOf(blob) {
  return blob.type === 'image/webp' ? 'webp' : 'jpg'
}

// Uploads the small copy next to the full photo. Returns its path, or null if that didn't work:
// the photo still hangs, the frame just downloads the full one. Not worth failing a photo over.
async function uploadSmallCopy(houseFolder, name, blob) {
  try {
    const small = await makeSmallCopy(blob)
    const path = `${houseFolder}/${name}-small.${extensionOf(small.blob)}`
    const { error } = await supabase.storage.from('photos').upload(path, small.blob, { contentType: small.blob.type })
    return error ? null : path
  } catch {
    return null
  }
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

// Uploads a shrunk photo (from shrinkPhoto) and hangs it in a frame or puts it in the album.
// slot = which frame (0-4), or null for the album. Returns the new photo, ready to show.
export async function hangPhoto(code, { blob, width, height }, slot, caption) {
  const id = await houseId(code)
  // A long random name, so nobody can guess the photo's address.
  const name = crypto.randomUUID()
  const path = `${id}/${name}.${extensionOf(blob)}`

  const { error: uploadError } = await supabase.storage.from('photos').upload(path, blob, { contentType: blob.type })
  if (uploadError) throw uploadError
  const smallPath = await uploadSmallCopy(id, name, blob)

  const { data, error } = await supabase
    .from('photos')
    .insert({ house_id: id, path, small_path: smallPath, slot, width, height, caption: caption.trim() || null })
    .select('id, path, small_path, caption, slot, width, height')
    .single()
  if (error) {
    // Don't leave files behind that no frame points to.
    await supabase.storage.from('photos').remove(smallPath ? [path, smallPath] : [path])
    throw error
  }
  return withUrl(data)
}

// Hangs a photo in a frame, or moves it off the wall into the album (slot = null).
// Nothing is uploaded: only the note of where it belongs changes. Returns the photo with its new place.
export async function movePhoto(photo, slot) {
  const { error } = await supabase.from('photos').update({ slot }).eq('id', photo.id)
  if (error) throw error
  return { ...photo, slot }
}

// Deletes a photo and its files, wherever it is in the house.
export async function takeDownPhoto(photo) {
  const { error } = await supabase.from('photos').delete().eq('id', photo.id)
  if (error) throw error
  // If only this part fails, the photo is already gone from the house; the files are just left over.
  await supabase.storage.from('photos').remove(photo.small_path ? [photo.path, photo.small_path] : [photo.path])
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
