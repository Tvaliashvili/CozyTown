import { useState } from 'react'
import { TABS } from '../data/options.js'
import { randomDesign } from '../data/design.js'
import { useI18n } from '../i18n/i18n.jsx'

// The bottom panel for decorating your house. Every tap changes the 3D house right away.
export default function Customizer({ design, onChange, onClose }) {
  const { t } = useI18n()
  const [tabId, setTabId] = useState(TABS[0].id)
  const tab = TABS.find((each) => each.id === tabId)

  function setField(field, value) {
    onChange({ ...design, [field]: value })
  }

  return (
    <section className="customizer">
      <div className="customizer-header">
        <button className="pill-button" onClick={onClose}>
          ← {t('backToStreet')}
        </button>
        <button className="pill-button accent" onClick={() => onChange(randomDesign())}>
          🎲 {t('surpriseMe')}
        </button>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((each) => (
          <button
            key={each.id}
            role="tab"
            aria-selected={each.id === tabId}
            className="tab"
            onClick={() => setTabId(each.id)}
          >
            {t(`tab.${each.id}`)}
          </button>
        ))}
      </div>

      <div className="tab-panel" role="tabpanel">
        {tab.controls.map(({ field, type, options }) => (
          <div className="control" key={field}>
            <h3>{t(`field.${field}`)}</h3>
            <div className="options">
              {options.map((value, i) =>
                type === 'color' ? (
                  <button
                    key={value}
                    className="swatch"
                    style={{ background: value }}
                    aria-pressed={design[field] === value}
                    aria-label={`${t(`field.${field}`)} ${i + 1}`}
                    onClick={() => setField(field, value)}
                  />
                ) : (
                  <button
                    key={String(value)}
                    className="choice"
                    aria-pressed={design[field] === value}
                    onClick={() => setField(field, value)}
                  >
                    {t(`${field}.${value}`)}
                  </button>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
