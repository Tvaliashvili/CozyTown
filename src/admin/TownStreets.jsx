import { useState } from 'react'
import { addStreet, setStreetOpen } from '../data/admin.js'
import { Link } from '../router.jsx'

// The town, neighbourhood by neighbourhood: open the next street when the current one is nearly
// full, and add new ones. A street on the map needs to be open; a house's own link works either way.
export default function TownStreets({ town, onChanged }) {
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  // Runs one change, then reloads so the list shows what the database has.
  async function run(change) {
    setError(null)
    setBusy(true)
    try {
      await change()
      await onChanged()
    } catch (problem) {
      setError(`That didn't work: ${problem.message ?? 'check the internet connection.'}`)
    }
    setBusy(false)
  }

  return (
    <section className="admin-section">
      <h2>Town map</h2>
      <p>
        Not linked from anywhere yet: <Link to="/map">/map</Link> opens it for anyone who types the address.
        Open one street at a time, so the town never looks empty.
      </p>
      {error && <p className="error" role="alert">{error}</p>}

      <ul className="admin-town">
        {town.map((hood) => (
          <li key={hood.slug}>
            <h3>{hood.nameEn}</h3>
            {hood.streets.length === 0 && <p className="admin-house-meta">No streets yet.</p>}
            <ul className="admin-streets">
              {hood.streets.map((street) => (
                <li key={street.slug} className="admin-street">
                  <span>
                    <strong>{street.nameEn}</strong>
                    <span className="admin-house-meta"> {street.takenPlots} of {street.plotCount} plots taken</span>
                  </span>
                  <span className={street.open ? 'chip green' : 'chip'}>{street.open ? 'Open' : 'Closed'}</span>
                  <button
                    type="button"
                    className="pill-button soft"
                    disabled={busy}
                    onClick={() => run(() => setStreetOpen(street.slug, !street.open))}
                  >
                    {street.open ? 'Close' : 'Open'}
                  </button>
                </li>
              ))}
            </ul>
            <AddStreet hood={hood} busy={busy} onAdd={(english, georgian) => run(() => addStreet(hood.slug, english, georgian))} />
          </li>
        ))}
      </ul>
    </section>
  )
}

function AddStreet({ hood, busy, onAdd }) {
  const [adding, setAdding] = useState(false)
  const [english, setEnglish] = useState('')
  const [georgian, setGeorgian] = useState('')

  if (!adding) {
    return (
      <button type="button" className="pill-button soft" onClick={() => setAdding(true)}>
        Add a street to {hood.nameEn}
      </button>
    )
  }

  async function submit(event) {
    event.preventDefault()
    await onAdd(english, georgian)
    setEnglish('')
    setGeorgian('')
    setAdding(false)
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <label className="admin-field">
        <span className="field-label">English name (also makes its address, so it can't change easily)</span>
        <input className="text-field" value={english} maxLength={60} required onChange={(e) => setEnglish(e.target.value)} />
      </label>
      <label className="admin-field">
        <span className="field-label">Georgian name</span>
        <input className="text-field" value={georgian} maxLength={60} required onChange={(e) => setGeorgian(e.target.value)} />
      </label>
      <div className="admin-actions">
        <button type="submit" className="pill-button accent" disabled={busy}>Add it, closed for now</button>
        <button type="button" className="pill-button soft" onClick={() => setAdding(false)}>Never mind</button>
      </div>
    </form>
  )
}
