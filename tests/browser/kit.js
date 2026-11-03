// Everything the browser tests share: throwaway accounts and houses (always removed afterwards),
// a phone-sized page that is signed in as someone, and small helpers for clicking and reading.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { need } from '../../scripts/backup/shared.js'

// Every test account uses this ending, so leftovers from a crashed run are easy to find and remove.
export const TEST_EMAIL_END = '@cozytown-test.dev'

export const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Today + n days as YYYY-MM-DD (Tbilisi is UTC+4; the few hours don't matter for the days we use).
export function daysFromNow(n) {
  return new Date(Date.now() + 4 * 3600000 + n * 86400000).toISOString().slice(0, 10)
}

export function makeKit({ settings, db, storage, browser, base }) {
  const results = { passed: 0, failed: 0 }
  const made = { users: [], houses: [] }
  const pageErrors = []
  const supabaseUrl = need(settings, 'VITE_SUPABASE_URL')
  const publicKey = need(settings, 'VITE_SUPABASE_KEY')
  const admin = createClient(supabaseUrl, need(settings, 'SUPABASE_SECRET_KEY'), { auth: { persistSession: false } }).auth.admin

  function check(name, ok, detail = '') {
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${!ok && detail ? '  - ' + detail : ''}`)
    if (ok) results.passed++
    else results.failed++
  }

  // A new sign-in account. Returns { id, email, session, client }; client acts as that person.
  async function newUser(name) {
    const email = `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}${TEST_EMAIL_END}`
    const password = 'test-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)
    const created = await admin.createUser({ email, password, email_confirm: true })
    if (created.error) throw created.error
    made.users.push(created.data.user.id)
    const client = createClient(supabaseUrl, publicKey, { auth: { persistSession: false } })
    const signedIn = await client.auth.signInWithPassword({ email, password })
    if (signedIn.error) throw signedIn.error
    return { id: created.data.user.id, email, session: signedIn.data.session, client }
  }

  // A claimed house on a free plot of the first street. extra = more columns, e.g. { title: 'x' }.
  async function newHouse(keeperId, extra = {}) {
    const columns = { keeper_id: keeperId, claimed_at: keeperId ? new Date().toISOString() : null, ...extra }
    const names = Object.keys(columns)
    const { rows: [house] } = await db.query(
      `insert into public.houses (street_id, plot, ${names.join(', ')})
       values ((select id from public.streets where slug = 'first-street'),
         (select p from generate_series(0, (select plot_count - 1 from public.streets where slug = 'first-street')) p
          where p not in (select plot from public.houses) order by p desc limit 1),
         ${names.map((_, i) => `$${i + 1}`).join(', ')})
       returning id, code, gift_code`,
      Object.values(columns),
    )
    made.houses.push(house.id)
    return house
  }

  // For houses a test makes through the website (the admin page): remove them afterwards too.
  function removeLater(houseId) {
    made.houses.push(houseId)
  }

  // A phone-sized page, signed in as `user` (or a visitor when user is null).
  async function openPage(user, { lang = 'en', width = 390, height = 844 } = {}) {
    const context = await browser.createBrowserContext()
    const page = await context.newPage()
    await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: true, hasTouch: true })
    page.on('pageerror', (error) => pageErrors.push(error.message))
    page.on('dialog', (dialog) => dialog.accept())
    await page.goto(base + '/')
    await page.evaluate((key, session, language) => {
      if (session) localStorage.setItem(key, JSON.stringify(session))
      localStorage.setItem('lang', language)
    }, `sb-${need(settings, 'SUPABASE_PROJECT_REF')}-auth-token`, user?.session ?? null, lang)
    return page
  }

  // Clicks the first element matching `selector` whose text contains `words`.
  async function clickText(page, selector, words) {
    const found = await page.evaluate((s, w) => {
      const element = [...document.querySelectorAll(s)].find((e) => e.textContent.includes(w))
      element?.click()
      return Boolean(element)
    }, selector, words)
    if (!found) throw new Error(`Nothing to click: ${selector} with "${words}"`)
  }

  // Waits until some element matching `selector` contains `words`.
  function waitForText(page, selector, words, timeout = 30000) {
    return page.waitForFunction((s, w) => [...document.querySelectorAll(s)].some((e) => e.textContent.includes(w)),
      { timeout }, selector, words)
  }

  // The visible text of the first match, or '' when there is none.
  function text(page, selector) {
    return page.evaluate((s) => document.querySelector(s)?.innerText ?? '', selector)
  }

  // A small picture file to upload as a "photo": a screenshot of the landing page.
  let photo
  async function photoFile() {
    if (photo) return photo
    photo = path.join(os.tmpdir(), `cozytown-test-photo-${process.pid}.jpg`)
    const page = await browser.newPage()
    await page.setViewport({ width: 400, height: 300 })
    await page.goto(base + '/')
    await page.screenshot({ path: photo, type: 'jpeg', quality: 70 })
    await page.close()
    return photo
  }

  // Removes everything this test made: photo files, houses (their rows go with them), accounts.
  async function cleanUp() {
    for (const houseId of made.houses) {
      for (const bucket of ['photos', 'capsule']) {
        const { data } = await storage.from(bucket).list(houseId, { limit: 1000 })
        if (data?.length) await storage.from(bucket).remove(data.map((file) => `${houseId}/${file.name}`))
      }
    }
    if (made.houses.length) await db.query('delete from public.houses where id = any($1)', [made.houses])
    if (made.users.length) {
      await db.query('delete from public.admins where user_id = any($1)', [made.users])
      await db.query('delete from auth.users where id = any($1)', [made.users])
    }
    for (const file of [photo].filter(Boolean)) fs.rmSync(file, { force: true })
  }

  return {
    base, db, browser, check, newUser, newHouse, removeLater, openPage,
    clickText, waitForText, text, photoFile, cleanUp, results, pageErrors,
  }
}
