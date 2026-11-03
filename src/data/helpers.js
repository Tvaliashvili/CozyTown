import { supabase } from '../lib/supabase.js'

// Helpers: family and friends the keeper invites to help fill the house (photos, letters, capsule).
// What they may do is decided by the database (supabase/migrations/20261104200000_helpers.sql).

// The keeper makes a one-time invite code (good for 14 days).
export async function createInvite(code) {
  const { data, error } = await supabase.rpc('create_helper_invite', { house_code: code })
  if (error) {
    error.tooMany = error.message.includes('up to 10') || error.message.includes('Too many')
    throw error
  }
  return data
}

// The link to send. It opens the sign-in page with the code already filled in.
// It uses the address the site is open on (not the printed cozytown.ge one), because it's
// only sent in a chat and used within days.
export function inviteUrl(inviteCode) {
  return `${window.location.origin}/signin?code=${inviteCode}`
}

// [{ user_id, email, added_at }], oldest first. Keeper only.
export async function loadHelpers(code) {
  const { data, error } = await supabase.rpc('get_helpers', { house_code: code })
  if (error) throw error
  return data
}

export async function removeHelper(code, helper) {
  const { error } = await supabase.rpc('remove_helper', { house_code: code, helper: helper.user_id })
  if (error) throw error
}
