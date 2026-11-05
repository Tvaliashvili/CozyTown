import { supabase } from '../lib/supabase.js'
import { houseId } from './inside.js'

// The time capsule: one chest per house that stays shut until its day (Tbilisi time).
// The locking is done by the database (supabase/migrations/20261104100000_time_capsule.sql and
// 20261107000000_seal_capsule_once.sql): the keeper fills and seals it once, and before the day
// the database refuses to hand over anything, even to the keeper. This file just asks.

// The chest from outside: { opensOn: '2030-02-14', itemCount, isOpen }, or null if it isn't sealed yet.
export async function loadCapsule(code) {
  const { data, error } = await supabase.rpc('get_capsule', { house_code: code })
  if (error) throw error
  const chest = data[0]
  return chest ? { opensOn: chest.opens_on, itemCount: chest.item_count, isOpen: chest.is_open } : null
}

// Seals the capsule in one go: the letter, the photos and the day it opens. After this nothing can
// be added and the day can't change. date is 'YYYY-MM-DD' (what a date box gives); photos is a list
// of what shrinkPhoto() returns. onProgress(done, total) is called as each photo finishes uploading.
// The error gets a "reason" the screen can explain: 'past', 'tooFar', 'sealed' or undefined.
export async function sealCapsule(code, { date, fromName, body, photos }, onProgress) {
  const id = photos.length > 0 ? await houseId(code) : null
  const uploaded = []
  // One at a time: kinder to a slow phone connection than all at once.
  for (const photo of photos) {
    const extension = photo.blob.type === 'image/webp' ? 'webp' : 'jpg'
    // Private bucket: this file can't be downloaded by anyone until the chest opens.
    const path = `${id}/${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage.from('capsule').upload(path, photo.blob, { contentType: photo.blob.type })
    if (error) throw error
    uploaded.push({ path, width: photo.width, height: photo.height })
    onProgress?.(uploaded.length, photos.length)
  }
  const { error } = await supabase.rpc('seal_capsule', {
    house_code: code,
    open_date: date,
    letter_from: fromName.trim() || null,
    letter_body: body.trim() || null,
    photos: uploaded,
  })
  // If this fails, the uploaded files stay behind unused (the app can't delete capsule files).
  // The nightly backup run removes files no capsule points to after 7 days (Q7).
  if (error) {
    if (error.message.includes('in the future')) error.reason = 'past'
    else if (error.message.includes('too far')) error.reason = 'tooFar'
    else if (error.message.includes('already sealed')) error.reason = 'sealed'
    throw error
  }
}

// Deletes a capsule that has opened, with everything inside, so the keeper can make a new one.
// The database refuses this while it's still locked. The photo files are removed by the nightly run (Q7).
export async function deleteOpenedCapsule(code) {
  const { error } = await supabase.rpc('delete_opened_capsule', { house_code: code })
  if (error) throw error
}

// Everything inside, oldest first, once the day has come. Photos get a link that works for a day.
// markSeen: false for "Download everything", so the zip doesn't count as the keeper looking inside
// and the "it has opened!" notice stays until they really do.
export async function openCapsule(code, { markSeen = true } = {}) {
  const { data, error } = await supabase.rpc('open_capsule', { house_code: code, mark_seen: markSeen })
  if (error) throw error
  const paths = data.filter((item) => item.photo_path).map((item) => item.photo_path)
  const urls = {}
  if (paths.length > 0) {
    const { data: signed, error: signError } = await supabase.storage.from('capsule').createSignedUrls(paths, 60 * 60 * 24)
    if (signError) throw signError
    for (const each of signed) urls[each.path] = each.signedUrl
  }
  return data.map((item) => ({ ...item, photoUrl: item.photo_path ? urls[item.photo_path] : null }))
}
