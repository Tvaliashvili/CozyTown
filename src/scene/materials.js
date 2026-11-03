import { MeshStandardMaterial } from 'three'

// One material per color, shared by every mesh that uses it.
// Fewer materials means less work for the phone's graphics chip.
const cache = new Map()
const glowing = []

export function getMaterial(color, { glow = false } = {}) {
  const key = glow ? `${color}:glow` : color
  if (!cache.has(key)) {
    const material = new MeshStandardMaterial({
      color,
      flatShading: true, // the faceted low-poly look
      roughness: 0.9,
      // Glowing things (lamps, windows) shine by themselves instead of using real lights,
      // which are expensive on phones.
      ...(glow && { emissive: color, emissiveIntensity: 1.4 }),
    })
    cache.set(key, material)
    if (glow) glowing.push(material)
  }
  return cache.get(key)
}

// Brightens or dims every glowing thing at once.
export function setGlowIntensity(intensity) {
  for (const material of glowing) material.emissiveIntensity = intensity
}
