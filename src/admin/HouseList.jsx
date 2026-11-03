import { useState } from 'react'
import { addLetter, setOrderPaid, unlockDesign } from '../data/admin.js'
import { groupGiftCode } from '../data/links.js'
import { formatDate } from '../lib/formatDate.js'
import { Link } from '../router.jsx'

// Every house, newest first, with what the admin can do for it.
export default function HouseList({ streets, houses, onChanged }) {
  const [search, setSearch] = useState('')

  // Finds a house by its code, name, buyer, contact or keeper's email.
  const words = search.trim().toLowerCase()
  const shown = words
    ? houses.filter((house) =>
        [house.code, house.title, house.buyer_name, house.buyer_contact, house.keeper_email]
          .some((text) => text?.toLowerCase().includes(words)),
      )
    : houses

  return (
    <section className="admin-section">
      <h2>Houses ({houses.length})</h2>
      <label className="admin-field">
        <span className="field-label">Search by code, name, buyer or email</span>
        <input className="text-field" type="search" value={search} onChange={(e) => setSearch(e.target.value)} />
      </label>
      {shown.length === 0 && <p>No houses found.</p>}
      <ul className="admin-houses">
        {shown.map((house) => (
          <HouseRow key={house.code} house={house} streets={streets} onChanged={onChanged} />
        ))}
      </ul>
    </section>
  )
}

function HouseRow({ house, streets, onChanged }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [writing, setWriting] = useState(false)
  const [letterFrom, setLetterFrom] = useState('')
  const [letterBody, setLetterBody] = useState('')
  const [letterSent, setLetterSent] = useState(false)

  const streetName = streets.find((each) => each.slug === house.street_slug)?.name_en ?? house.street_slug

  // Runs one change, then reloads the list so it shows the new state.
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

  function unlock() {
    const sure = window.confirm(
      'Unlock the outside so the keeper can redesign it?\nOnly do this after the 15 ₾ redesign is paid.',
    )
    if (sure) run(() => unlockDesign(house.code))
  }

  function sendLetter(event) {
    event.preventDefault()
    run(async () => {
      await addLetter(house.code, letterFrom, letterBody)
      setLetterFrom('')
      setLetterBody('')
      setWriting(false)
      setLetterSent(true)
    })
  }

  return (
    <li className="admin-house">
      <div className="admin-house-head">
        <strong>{house.title || 'No name yet'}</strong>
        <code>{house.code}</code>
      </div>
      <p className="admin-house-meta">
        {streetName}, plot {house.plot + 1} · created {formatDate(house.created_at, 'en')}
      </p>

      <ul className="admin-chips">
        {house.keeper_email ? (
          <li className="chip green">Keeper: {house.keeper_email}, since {formatDate(house.claimed_at, 'en')}</li>
        ) : (
          <li className="chip">Not claimed · gift code {groupGiftCode(house.gift_code)}</li>
        )}
        <li className={house.design_final ? 'chip green' : 'chip'}>
          {house.design_final ? 'Outside final' : 'Outside not final yet'}
        </li>
        <li className="chip">{house.photo_count} photos · {house.lantern_count} lanterns</li>
      </ul>

      <div className="admin-order">
        <p>
          {house.buyer_name || 'No buyer saved'}
          {house.buyer_contact && <> · {house.buyer_contact}</>}
          {house.price_gel !== null && <> · {house.price_gel} ₾</>}
          {' · '}
          <span className={house.paid ? 'paid' : 'unpaid'}>{house.paid ? 'Paid' : 'Not paid'}</span>
        </p>
        {house.note && <p className="admin-note">{house.note}</p>}
      </div>

      <div className="admin-actions">
        <Link to={`/h/${house.code}/card`} className="pill-button accent">Card</Link>
        <Link to={`/h/${house.code}`} className="pill-button soft">Open</Link>
        <button type="button" className="pill-button soft" disabled={busy} onClick={() => run(() => setOrderPaid(house.code, !house.paid))}>
          {house.paid ? 'Mark not paid' : 'Mark paid'}
        </button>
        <button type="button" className="pill-button soft" onClick={() => { setWriting(!writing); setLetterSent(false) }}>
          Add a letter
        </button>
        {house.design_final && (
          <button type="button" className="pill-button soft" disabled={busy} onClick={unlock}>
            Unlock outside (15 ₾)
          </button>
        )}
      </div>

      {letterSent && <p className="admin-ok" role="status">Letter put in the mailbox.</p>}
      {writing && (
        <form className="admin-form" onSubmit={sendLetter}>
          <label className="admin-field">
            <span className="field-label">From</span>
            <input className="text-field" value={letterFrom} maxLength={60} onChange={(e) => setLetterFrom(e.target.value)} />
          </label>
          <label className="admin-field">
            <span className="field-label">Letter (you won't be able to read it back once it's sent)</span>
            <textarea className="text-field" rows={6} value={letterBody} maxLength={5000} required
              onChange={(e) => setLetterBody(e.target.value)} />
          </label>
          <button type="submit" className="big-button accent" disabled={busy || !letterBody.trim()}>
            {busy ? 'Sending…' : 'Put it in the mailbox'}
          </button>
        </form>
      )}

      {error && <p className="error" role="alert">{error}</p>}
    </li>
  )
}
