// Phone photos are often 3-8 MB. We shrink them on the phone before uploading, so the upload is
// quick on mobile data and the room opens fast for visitors on budget phones.
// 1280 px on the longest side still looks sharp when a photo is opened full screen.
const LONGEST_SIDE = 1280
const QUALITY = 0.82
// The small copy shown in the picture frames. Frames are at most about 130 px wide, on phone screens
// that pack up to 3 real pixels into each one, so this stays sharp at around 30 KB instead of 250 KB.
const SMALL_LONGEST_SIDE = 480
const SMALL_QUALITY = 0.7

// Returns { blob, width, height }. Throws if the browser can't read the file
// (for example an unusual format), so the caller can say "try another photo".
export function shrinkPhoto(file) {
  return shrink(file, LONGEST_SIDE, QUALITY)
}

// Makes the small copy from an already shrunk photo. Same answer as shrinkPhoto.
export function makeSmallCopy(blob) {
  return shrink(blob, SMALL_LONGEST_SIDE, SMALL_QUALITY)
}

async function shrink(file, longestSide, quality) {
  const image = await openImage(file)
  const scale = Math.min(1, longestSide / Math.max(image.naturalWidth, image.naturalHeight))
  const width = Math.round(image.naturalWidth * scale)
  const height = Math.round(image.naturalHeight * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(image, 0, 0, width, height)

  let blob = await toBlob(canvas, 'image/webp', quality)
  // Older iPhones can't make WebP and hand back a PNG instead, which is far too big. JPEG works everywhere.
  if (!blob || blob.type !== 'image/webp') blob = await toBlob(canvas, 'image/jpeg', quality)
  if (!blob) throw new Error('Could not shrink the photo')
  return { blob, width, height }
}

// Loading the file into an <img> (instead of reading its bytes ourselves) makes the browser
// turn sideways phone photos the right way up.
async function openImage(file) {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}
