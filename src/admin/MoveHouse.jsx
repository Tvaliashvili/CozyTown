import { useState } from 'react'
import { moveHouse } from '../data/admin.js'
import { GardenQuarterNote } from './NewOrder.jsx'

// Moves a house to a free plot, for example to the Garden Quarter when its person has passed away.
// Links have no street in them, so printed QR codes keep working.
// quietStreets: the streets of the Garden Quarter (see AdminPage).
export default function MoveHouse({ house, streets, houses, quietStreets, onMove, busy }) {
  const [street, setStreet] = useState(house.street_slug)
  const [plot, setPlot] = useState(null)

  const chosenStreet = streets.find((each) => each.slug === street)
  const takenPlots = new Set(houses.filter((each) => each.street_slug === street).map((each) => each.plot))

  function submit(event) {
    event.preventDefault()
    onMove(() => moveHouse(house.code, street, plot))
  }

  return (
    <form className="admin-form" onSubmit={submit}>
      <label className="admin-field">
        <span className="field-label">Move to which street? The link and QR code stay the same.</span>
        <select
          className="text-field"
          value={street}
          onChange={(e) => {
            setStreet(e.target.value)
            setPlot(null)
          }}
        >
          {streets.map((each) => (
            <option key={each.slug} value={each.slug}>
              {each.name_en}{each.is_open ? '' : ' (closed)'}
            </option>
          ))}
        </select>
      </label>
      {quietStreets.has(street) && <GardenQuarterNote />}
      <fieldset className="admin-field">
        <legend className="field-label">Plot, counted from the left</legend>
        <div className="admin-plots">
          {Array.from({ length: chosenStreet?.plot_count ?? 0 }, (_, each) => (
            <button
              key={each}
              type="button"
              className="choice"
              aria-pressed={plot === each}
              disabled={takenPlots.has(each)}
              onClick={() => setPlot(each)}
            >
              {each + 1}
            </button>
          ))}
        </div>
      </fieldset>
      <button type="submit" className="big-button accent" disabled={busy || plot === null}>
        {plot === null ? 'Pick a plot first' : 'Move the house'}
      </button>
    </form>
  )
}
