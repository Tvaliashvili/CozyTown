// "Download everything": the zip's contents, a sealed and an opened capsule, the offline page
// with no internet, and that people's words can't run as code. Run with: npm run test:browser -- export
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { unzipSync, strFromU8 } from 'fflate'
import { daysFromNow, wait } from './kit.js'

export default async function run({ db, browser, check, newUser, newHouse, openPage, photoFile, base }) {
  const keeper = await newUser('export')
  const house = await newHouse(keeper.id, {
    title: "Nino's <house>",
    design: { roofStyle: 'hip', wallColor: '#cfe3d2', windowStyle: 'shuttered', garden: 'hedge' },
  })
  const supa = keeper.client
  const photo = new Blob([fs.readFileSync(await photoFile())], { type: 'image/jpeg' })

  // Fill the house the way the app does, as the keeper
  const wallPath = `${house.id}/${crypto.randomUUID()}.jpg`
  let r = await supa.storage.from('photos').upload(wallPath, photo, { contentType: 'image/jpeg' })
  if (r.error) throw r.error
  await supa.from('photos').insert({ house_id: house.id, path: wallPath, slot: 0, caption: 'Summer in Kakheti <3', width: 400, height: 300 })
  await supa.from('letters').insert({ house_id: house.id, from_name: 'Mum', body: 'Happy birthday!\n<script>alert(1)</script>' })
  await supa.rpc('light_lantern', { house_code: house.code, from_name: 'Nana', message: 'Thinking of you' })
  await supa.rpc('set_capsule_date', { house_code: house.code, open_date: daysFromNow(3) })
  const capsulePath = `${house.id}/${crypto.randomUUID()}.jpg`
  r = await supa.storage.from('capsule').upload(capsulePath, photo, { contentType: 'image/jpeg' })
  if (r.error) throw r.error
  await supa.rpc('add_to_capsule', { house_code: house.code, letter_from: 'Dad', letter_body: 'For later', photo_path: capsulePath, photo_width: 400, photo_height: 300 })

  const downloads = fs.mkdtempSync(path.join(os.tmpdir(), 'cozytown-export-'))
  try {
    const page = await openPage(keeper)
    const cdp = await page.createCDPSession()
    await cdp.send('Browser.setDownloadBehavior', {
      behavior: 'allow', downloadPath: downloads, browserContextId: page.browserContext().id,
    })

    async function downloadZip() {
      for (const file of fs.readdirSync(downloads)) fs.rmSync(path.join(downloads, file), { recursive: true })
      await page.click('.room-export button')
      await page.waitForFunction(() => /Downloaded|didn't work/.test(document.querySelector('.room-export').innerText), { timeout: 60000 })
      for (let i = 0; i < 50 && !fs.readdirSync(downloads).some((f) => f.endsWith('.zip')); i++) await wait(200)
      const name = fs.readdirSync(downloads).find((f) => f.endsWith('.zip'))
      return name ? unzipSync(fs.readFileSync(path.join(downloads, name))) : {}
    }

    await page.goto(`${base}/h/${house.code}/inside`)
    await page.waitForSelector('.room-export button', { timeout: 60000 })
    await page.waitForSelector('.frame img')
    let files = await downloadZip()
    let names = Object.keys(files)
    check('the zip downloads', names.includes('index.html'), names.join(', '))
    check('the zip has the photo, the letter and lanterns.txt',
      names.some((n) => n.startsWith('photos/')) && names.some((n) => n.startsWith('letters/')) && names.includes('lanterns.txt'), names.join(', '))
    let html = strFromU8(files['index.html'] ?? new Uint8Array())
    check('a sealed capsule stays out of the zip', html.includes('Still sealed') && !names.some((n) => n.startsWith('capsule/')))
    check('a <script> in a letter stays plain text', !html.includes('<script>alert') && html.includes('&lt;script&gt;'))

    // The capsule opens; download again
    await db.query(`update public.capsules set opens_on = (now() at time zone 'Asia/Tbilisi')::date where house_id = $1`, [house.id])
    await page.reload()
    await page.waitForSelector('.room-export button', { timeout: 60000 })
    files = await downloadZip()
    names = Object.keys(files)
    html = strFromU8(files['index.html'] ?? new Uint8Array())
    check('an opened capsule is in the zip', html.includes('For later') && names.some((n) => n.startsWith('capsule/') && n.endsWith('.jpg')))
    check('lanterns.txt has the lantern', strFromU8(files['lanterns.txt'] ?? new Uint8Array()).includes('Nana'))

    // Open the offline page from disk with the internet switched off
    const out = path.join(downloads, 'unzipped')
    for (const [name, bytes] of Object.entries(files)) {
      fs.mkdirSync(path.dirname(path.join(out, name)), { recursive: true })
      fs.writeFileSync(path.join(out, name), bytes)
    }
    const offline = await browser.newPage()
    await offline.setOfflineMode(true)
    await offline.goto('file:///' + path.join(out, 'index.html').replace(/\\/g, '/'))
    await wait(800)
    const images = await offline.$$eval('img', (list) => list.map((img) => img.naturalWidth > 0))
    check('the offline page shows every picture with no internet', images.length >= 2 && images.every(Boolean), JSON.stringify(images))
    await offline.close()
  } finally {
    fs.rmSync(downloads, { recursive: true, force: true })
  }
}
