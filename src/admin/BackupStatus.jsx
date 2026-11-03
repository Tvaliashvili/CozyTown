import { useEffect, useState } from 'react'
import { loadLastBackup } from '../data/admin.js'

const ACTIONS_PAGE = 'https://github.com/Tvaliashvili/CozyTown/actions/workflows/nightly-backup.yml'

// A backup runs every night at 05:00 Tbilisi time. Older than this means at least one was missed.
const LATE_AFTER_HOURS = 30

// One line at the top of /admin: when the last nightly backup finished, or a red warning
// if backups have stopped. The backups themselves: docs/BACKUPS.md.
export default function BackupStatus() {
  // undefined = still loading, null = there has never been one
  const [backup, setBackup] = useState(undefined)

  useEffect(() => {
    loadLastBackup().then(setBackup).catch(() => setBackup(null))
  }, [])

  if (backup === undefined) return null

  const hoursAgo = backup ? (Date.now() - Date.parse(backup.finished_at)) / 3_600_000 : Infinity
  const late = hoursAgo > LATE_AFTER_HOURS || backup.missing_files > 0

  let text
  if (!backup) {
    text = 'No backup has run yet.'
  } else {
    const when = new Date(backup.finished_at).toLocaleString('en-GB', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tbilisi',
    })
    // size_bytes is everything kept in R2 (all backups and photo copies), which must stay under the free 10 GB.
    const size = (backup.size_bytes / 1024 / 1024).toFixed(1)
    text = `Last backup: ${when} · ${backup.file_count} photos · backups take ${size} MB of the free 10 GB.`
    if (backup.missing_files > 0) text += ` ${backup.missing_files} photos were missing from it.`
    else if (late) text += ' Backups may have stopped.'
  }

  return (
    <p className={late ? 'admin-backup late' : 'admin-backup'} role={late ? 'alert' : undefined}>
      {text}
      {late && (
        <>
          {' '}<a href={ACTIONS_PAGE} target="_blank" rel="noreferrer">Check on GitHub</a>.
        </>
      )}
    </p>
  )
}
