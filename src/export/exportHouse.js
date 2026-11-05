import { strToU8, zipSync } from 'fflate'
import { loadCapsule, openCapsule } from '../data/capsule.js'
import { houseId, loadLetters, loadPhotos } from '../data/inside.js'
import { formatDate, formatDay } from '../lib/formatDate.js'
import { supabase } from '../lib/supabase.js'
import { houseDrawing } from './houseDrawing.js'

// "Download everything": our promise that memories are always the keeper's (see CLAUDE.md).
// Makes one zip on the phone itself and hands it to the browser to save:
//   index.html       a page that opens without internet: the house, photos, letters, lanterns
//   photos/          every photo in the house: the frames and the album
//   letters/         every letter, as plain text
//   capsule/         the time capsule, once its day has come (before that, nobody can get it)
//   lanterns.txt     who lit a lantern and what they wrote
// This file is only downloaded when the button is pressed, so it doesn't slow the town down.
// t and lang: the words for the offline page, in the language the keeper is using.
export async function exportHouse({ code, title, design, t, lang }) {
  const [photos, letters, lanterns, capsule] = await Promise.all([
    loadPhotos(code),
    loadLetters(code),
    loadAllLanterns(code),
    loadCapsule(code),
  ])
  const capsuleItems = capsule?.isOpen ? await openCapsule(code, { markSeen: false }) : []

  const files = {}
  // Photos are already compressed, so they're stored as they are (level 0) to save the phone's effort.
  const stored = (bytes) => [bytes, { level: 0 }]

  const photoFiles = await Promise.all(photos.map((photo) => download(photo.url)))
  photos.forEach((photo, i) => {
    photo.file = `photos/${pad(i + 1)}.${extension(photo.path)}`
    files[photo.file] = stored(photoFiles[i])
  })

  letters.slice().reverse().forEach((letter, i) => {
    files[`letters/${pad(i + 1)} ${letter.created_at.slice(0, 10)}.txt`] = strToU8(letterText(letter, t, lang))
  })

  const capsulePhotos = await Promise.all(capsuleItems.map((item) => (item.photoUrl ? download(item.photoUrl) : null)))
  capsuleItems.forEach((item, i) => {
    const name = `capsule/${pad(i + 1)}`
    if (item.body) files[`${name}.txt`] = strToU8(letterText(item, t, lang))
    if (capsulePhotos[i]) {
      item.file = `${name}.${extension(item.photo_path)}`
      files[item.file] = stored(capsulePhotos[i])
    }
  })

  if (lanterns.length > 0) {
    files['lanterns.txt'] = strToU8(
      lanterns
        .map((l) => `${formatDate(l.created_at, lang)} · ${l.from_name || t('export.someone')}${l.message ? `\n${l.message}` : ''}`)
        .join('\n\n'),
    )
  }

  files['index.html'] = strToU8(offlinePage({ title, design, photos, letters, lanterns, capsule, capsuleItems, t, lang }))

  // zipSync, not zip: the background-worker version can stall on some browsers, and with
  // photos stored as they are, packing takes well under a second even on a budget phone.
  const bytes = zipSync(files)
  saveFile(new Blob([bytes], { type: 'application/zip' }), `cozy-town-${code}-${new Date().toISOString().slice(0, 10)}.zip`)
}

// Every lantern, oldest first (the keeper's list on the street shows only the newest 100).
async function loadAllLanterns(code) {
  const { data, error } = await supabase
    .from('lanterns')
    .select('from_name, message, created_at')
    .eq('house_id', await houseId(code))
    .order('created_at')
  if (error) throw error
  return data
}

async function download(url) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Download failed: ${response.status}`)
  return new Uint8Array(await response.arrayBuffer())
}

function saveFile(blob, name) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser a moment to start saving before the file's memory is freed.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

const pad = (n) => String(n).padStart(2, '0')
const extension = (path) => (path.endsWith('.webp') ? 'webp' : 'jpg')

function letterText(letter, t, lang) {
  const from = letter.from_name ? `${t('letters.from')} ${letter.from_name}\n` : ''
  return `${from}${formatDate(letter.created_at, lang)}\n\n${letter.body ?? ''}\n`
}

// People's words go into a web page, so characters like < must not be read as page code.
function escape(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function offlinePage({ title, design, photos, letters, lanterns, capsule, capsuleItems, t, lang }) {
  const letterHtml = (letter) => `
    <article class="letter">
      <p class="date">${escape(formatDate(letter.created_at, lang))}</p>
      ${letter.file ? `<img src="${letter.file}" alt="">` : ''}
      ${letter.body ? `<p class="body">${escape(letter.body)}</p>` : ''}
      ${letter.from_name ? `<p class="sign">${escape(letter.from_name)}</p>` : ''}
    </article>`

  let capsuleHtml = `<p class="empty">${escape(t('export.capsuleNone'))}</p>`
  if (capsule?.isOpen) {
    capsuleHtml = capsuleItems.length ? capsuleItems.map(letterHtml).join('') : `<p class="empty">${escape(t('capsule.openedEmpty'))}</p>`
  } else if (capsule) {
    capsuleHtml = `<p class="empty">${escape(t('export.capsuleLocked').replace('{date}', formatDay(capsule.opensOn, lang)))}</p>`
  }

  return `<!doctype html>
<html lang="${lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(title)}</title>
<style>
  body { margin: 0; background: #fff6e9; color: #4a3b33; font: 17px/1.6 Georgia, 'Noto Serif Georgian', serif; }
  main { max-width: 680px; margin: 0 auto; padding: 24px 16px 60px; }
  header { text-align: center; }
  header svg { width: 100%; max-width: 360px; border-radius: 20px; }
  h1 { margin: 12px 0 0; font-size: 2rem; }
  h2 { margin: 40px 0 12px; font-size: 1.4rem; }
  .note, .empty, .date { color: #6e5a4e; }
  .photos { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px; }
  figure { margin: 0; padding: 10px; background: #fff; border-radius: 12px; box-shadow: 0 4px 14px rgba(74,59,51,.12); }
  figure img, .letter img { display: block; width: 100%; height: auto; border-radius: 8px; }
  figcaption { margin-top: 6px; font-size: .95rem; }
  .letter { margin: 0 0 16px; padding: 20px; background: #fffdf8; border-radius: 14px; box-shadow: 0 4px 14px rgba(74,59,51,.12); }
  .letter p { margin: 0; }
  .body { margin-top: 10px !important; white-space: pre-wrap; overflow-wrap: anywhere; }
  .sign { margin-top: 10px !important; text-align: right; font-style: italic; }
  ul { padding-left: 20px; }
  li { margin-bottom: 8px; }
</style>
</head>
<body>
<main>
<header>
  ${houseDrawing(design)}
  <h1>${escape(title)}</h1>
  <p class="note">${escape(t('export.downloadedOn').replace('{date}', formatDate(new Date().toISOString(), lang)))}</p>
</header>

<h2>${escape(t('export.photos'))}</h2>
${photos.length ? `<div class="photos">${photos.map((p) => `<figure><img src="${p.file}" alt="">${p.caption ? `<figcaption>${escape(p.caption)}</figcaption>` : ''}</figure>`).join('')}</div>` : `<p class="empty">${escape(t('export.noPhotos'))}</p>`}

<h2>${escape(t('room.lettersTitle'))}</h2>
${letters.length ? letters.slice().reverse().map(letterHtml).join('') : `<p class="empty">${escape(t('export.noLetters'))}</p>`}

<h2>${escape(t('capsule.title'))}</h2>
${capsuleHtml}

<h2>${escape(t('keeperLantern.title'))}</h2>
${lanterns.length ? `<ul>${lanterns.map((l) => `<li><strong>${escape(l.from_name || t('export.someone'))}</strong> · <span class="date">${escape(formatDate(l.created_at, lang))}</span>${l.message ? `<br>${escape(l.message)}` : ''}</li>`).join('')}</ul>` : `<p class="empty">${escape(t('export.noLanterns'))}</p>`}
</main>
</body>
</html>
`
}
