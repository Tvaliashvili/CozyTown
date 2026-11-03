import { useState } from 'react'
import { TABS } from '../data/options.js'
import { useI18n } from '../i18n/i18n.jsx'
import { CheckIcon, LockIcon, TAB_ICONS } from './icons.jsx'

// The bottom panel for decorating your house. Every tap changes the 3D house right away.
// onFinish: if given (a real house, not the demo), shows the "Make it final" button.
// saveFailed: shows a small warning when the last change didn't reach the database.
export default function Customizer({ design, onChange, onClose, onFinish, saveFailed }) {
  const { t } = useI18n()
  const [tabId, setTabId] = useState(TABS[0].id)
  const tab = TABS.find((each) => each.id === tabId)

  function setField(field, value) {
    onChange({ ...design, [field]: value })
  }

  return (
    <section className="customizer" aria-label={t('yourHouse')}>
      <div className="sheet-handle" aria-hidden="true" />
      <div className="customizer-header">
        <h2>{t('yourHouse')}</h2>
        <button className="pill-button accent" onClick={onClose}>
          {t('done')}
        </button>
      </div>

      <div className="tabs" role="tablist">
        {TABS.map((each) => {
          const Icon = TAB_ICONS[each.id]
          return (
            <button
              key={each.id}
              role="tab"
              aria-selected={each.id === tabId}
              className="tab"
              onClick={() => setTabId(each.id)}
            >
              <Icon />
              {t(`tab.${each.id}`)}
            </button>
          )
        })}
      </div>

      <div className="tab-panel" role="tabpanel">
        {tab.controls.map(({ field, type, options }) => (
          <div className="control" key={field}>
            <h3>{t(`field.${field}`)}</h3>
            <div className="options">
              {options.map((value, i) => {
                const chosen = design[field] === value
                return type === 'color' ? (
                  <button
                    key={value}
                    className="swatch"
                    style={{ background: value }}
                    aria-pressed={chosen}
                    aria-label={`${t(`field.${field}`)} ${i + 1}`}
                    onClick={() => setField(field, value)}
                  >
                    {chosen && <CheckIcon />}
                  </button>
                ) : (
                  <button
                    key={String(value)}
                    className="choice"
                    aria-pressed={chosen}
                    onClick={() => setField(field, value)}
                  >
                    {t(`${field}.${value}`)}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {saveFailed && (
        <p className="save-warning" role="alert">
          {t('save.error')}
        </p>
      )}
      {onFinish && (
        <button className="finish-button" onClick={onFinish}>
          <LockIcon />
          {t('finish.button')}
        </button>
      )}
    </section>
  )
}
