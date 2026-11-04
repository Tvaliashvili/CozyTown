import { useState } from 'react'
import { createOrder } from '../data/admin.js'
import { DEFAULT_DESIGN } from '../data/design.js'
import { groupGiftCode, shortHouseUrl } from '../data/links.js'
import { Link } from '../router.jsx'
import DesignPicker from './DesignPicker.jsx'

const EMPTY_ORDER = {
  plot: null,
  title: '',
  buyer: '',
  contact: '',
  price: '',
  paid: false,
  note: '',
  letterFrom: '',
  letterBody: '',
  quiet: false,
}

// The "New order" form: one filled-in form makes one house, ready to print a card for.
export default function NewOrder({ streets, houses, onCreated }) {
  const [street, setStreet] = useState(streets[0]?.slug ?? '')
  const [order, setOrder] = useState(EMPTY_ORDER)
  // The outside starts as the default house unless the buyer asked for something.
  // The keeper can still change it until they press "Make it final".
  const [pickDesign, setPickDesign] = useState(false)
  const [design, setDesign] = useState(DEFAULT_DESIGN)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [created, setCreated] = useState(null)

  const chosenStreet = streets.find((each) => each.slug === street)
  // { plotNumber: house } for the plots already taken on this street
  const takenPlots = Object.fromEntries(
    houses.filter((house) => house.street_slug === street).map((house) => [house.plot, house]),
  )

  function setField(field, value) {
    setOrder({ ...order, [field]: value })
  }

  async function submit(event) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const codes = await createOrder({ ...order, street, design: pickDesign ? design : {} })
      setCreated({ ...codes, title: order.title.trim() })
      setOrder(EMPTY_ORDER)
      setPickDesign(false)
      setDesign(DEFAULT_DESIGN)
      await onCreated()
    } catch (problem) {
      setError(
        problem.message?.includes('plot is taken')
          ? 'Someone just took that plot. Please pick another one.'
          : `Couldn't create the house: ${problem.message ?? 'check the internet connection.'}`,
      )
    }
    setBusy(false)
  }

  return (
    <section className="admin-section">
      <h2>New order</h2>

      {created && (
        <div className="admin-created" role="status">
          <p>
            <strong>House created{created.title && `: ${created.title}`}</strong>
          </p>
          <p>
            Link: <code>{shortHouseUrl(created.code)}</code>
            <br />
            Gift code: <code>{groupGiftCode(created.gift_code)}</code>
          </p>
          <div className="admin-actions">
            <Link to={`/h/${created.code}/card`} className="pill-button accent">Print the card</Link>
            <Link to={`/h/${created.code}`} className="pill-button soft">Open the house</Link>
            <button type="button" className="pill-button soft" onClick={() => setCreated(null)}>New order</button>
          </div>
        </div>
      )}

      {!created && (
        <form className="admin-form" onSubmit={submit}>
          {streets.length > 1 && (
            <label className="admin-field">
              <span className="field-label">Street</span>
              <select
                className="text-field"
                value={street}
                onChange={(e) => {
                  setStreet(e.target.value)
                  setField('plot', null)
                }}
              >
                {streets.map((each) => (
                  <option key={each.slug} value={each.slug}>{each.name_en}{each.is_open ? '' : ' (closed)'}</option>
                ))}
              </select>
            </label>
          )}

          <fieldset className="admin-field">
            <legend className="field-label">Plot on {chosenStreet?.name_en}, counted from the left</legend>
            <div className="admin-plots">
              {Array.from({ length: chosenStreet?.plot_count ?? 0 }, (_, plot) => {
                const taken = takenPlots[plot]
                return (
                  <button
                    key={plot}
                    type="button"
                    className="choice"
                    aria-pressed={order.plot === plot}
                    disabled={Boolean(taken)}
                    title={taken ? `Taken: ${taken.title || taken.code}` : 'Free'}
                    onClick={() => setField('plot', plot)}
                  >
                    {plot + 1}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <TextField label="House name, shown inside (e.g. Nino's house)" value={order.title} maxLength={60}
            onChange={(value) => setField('title', value)} />

          <h3>Buyer (only admins see this)</h3>
          <TextField label="Buyer's name" value={order.buyer} maxLength={100} onChange={(value) => setField('buyer', value)} />
          <TextField label="How to reach them (Instagram, phone…)" value={order.contact} maxLength={200}
            onChange={(value) => setField('contact', value)} />
          <div className="admin-row">
            <TextField label="Price, ₾" value={order.price} type="number" min="0" step="0.01" placeholder="39"
              onChange={(value) => setField('price', value)} />
            <label className="admin-check">
              <input type="checkbox" checked={order.paid} onChange={(e) => setField('paid', e.target.checked)} />
              Paid already
            </label>
          </div>
          <TextField label="Note (card, keychain, delivery address…)" value={order.note} maxLength={2000} multiline
            onChange={(value) => setField('note', value)} />

          <h3>The buyer's letter (goes in the mailbox)</h3>
          <TextField label="From (e.g. Giorgi)" value={order.letterFrom} maxLength={60}
            onChange={(value) => setField('letterFrom', value)} />
          <TextField label="Letter. Leave empty if they'll send it later." value={order.letterBody} maxLength={5000}
            multiline rows={6} onChange={(value) => setField('letterBody', value)} />

          <h3>Outside of the house</h3>
          <label className="admin-check">
            <input type="checkbox" checked={order.quiet} onChange={(e) => setField('quiet', e.target.checked)} />
            Memorial house: quiet signs only (no gift bow, no gift box)
          </label>
          <label className="admin-check">
            <input type="checkbox" checked={pickDesign} onChange={(e) => setPickDesign(e.target.checked)} />
            The buyer chose colors (the keeper can still change them)
          </label>
          {pickDesign && <DesignPicker design={design} onChange={setDesign} />}

          {error && <p className="error" role="alert">{error}</p>}
          <button type="submit" className="big-button accent" disabled={busy || order.plot === null}>
            {busy ? 'Creating…' : order.plot === null ? 'Pick a plot first' : 'Create the house'}
          </button>
        </form>
      )}
    </section>
  )
}

function TextField({ label, value, onChange, multiline = false, ...rest }) {
  const Box = multiline ? 'textarea' : 'input'
  return (
    <label className="admin-field">
      <span className="field-label">{label}</span>
      <Box className="text-field" value={value} onChange={(e) => onChange(e.target.value)} rows={multiline ? 3 : undefined} {...rest} />
    </label>
  )
}
