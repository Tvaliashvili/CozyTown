import { useEffect, useState } from 'react'
import { loadStorageUse } from '../data/admin.js'

// Supabase's free plan holds about 1 GB of files. Warn well before that: moving takes some days.
const FREE_MB = 1024
const WARN_AT_MB = 700

// One line at the top of /admin: how full the photo storage is. Downloads (the other free limit,
// about 5 GB a month) aren't something the database knows; those are on Supabase's usage page.
export default function StorageStatus() {
  const [use, setUse] = useState(null)

  useEffect(() => {
    loadStorageUse().then(setUse).catch(() => setUse(null))
  }, [])

  if (!use) return null

  const mb = Number(use.bytes) / 1024 / 1024
  const high = mb >= WARN_AT_MB
  return (
    <p className={high ? 'admin-backup late' : 'admin-backup'} role={high ? 'alert' : undefined}>
      Photo storage: {mb.toFixed(1)} MB of the free {FREE_MB} MB · {use.files} files.
      {high && ' Getting full: time to move to Supabase Pro or put photos on R2.'}
      {' '}Check downloads on Supabase's usage page.
    </p>
  )
}
