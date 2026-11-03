import { supabase } from '../lib/supabase.js'
import { houseId } from './inside.js'

// The time capsule: one chest per house that stays shut until its day (Tbilisi time).
// The locking is done by the database (supabase/migrations/20261104100000_time_capsule.sql):
// before the day it refuses to hand over anything, even to the keeper. This file just asks.

// The chest from outside: { opensOn: '2030-02-14', itemCount, isOpen }, or null if there's no chest yet.
export async function loadCapsule(code) {
  const { data, error } = await supabase.rpc('get_capsule', { house_code: code })
  if (error) throw error
  const chest = data[0]
  return chest ? { opensOn: chest.opens_on, itemCount: chest.item_count, isOpen: chest.is_open } : null
}

// Choose the day it opens, or move it later. date is 'YYYY-MM-DD' (what a date box gives).
// The error gets a "reason" the screen can explain: 'past', 'tooFar', 'earlier' or undefined.
export async function setCapsuleDate(code, date) {
  const { error } = await supabase.rpc('set_capsule_date', { house_code: code, open_date: date })
  if (error) {
    if (error.message.includes('in the future')) error.reason = 'past'
    else if (error.message.includes('too far')) error.reason = 'tooFar'
    else if (error.message.includes('only move later')) error.reason = 'earlier'
    throw error
  }
}

// Seals a letter and/or a photo inside. photo is what shrinkPhoto() returns, or null.
export async function addToCapsule(code, { fromName, body, photo }) {
  let path = null
  if (photo) {
    const id = await houseId(code)
    const extension = photo.blob.type === 'image/webp' ? 'webp' : 'jpg'
    // Private bucket: this file can't be downloaded by anyone until the chest opens.
    path = `${id}/${crypto.randomUUID()}.${extension}`
    const { error } = await supabase.storage.from('capsule').upload(path, photo.blob, { contentType: photo.blob.type })
    if (error) throw error
  }
  const { error } = await supabase.rpc('add_to_capsule', {
    house_code: code,
    letter_from: fromName.trim() || null,
    letter_body: body.trim() || null,
    photo_path: path,
    photo_width: photo?.width ?? null,
    photo_height: photo?.height ?? null,
  })
  // The photo file can't be deleted while the chest is locked (nobody can touch it), so if this
  // fails it just stays behind unused. Rare, and harmless.
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
