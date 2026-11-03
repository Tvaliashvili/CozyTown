import { TABS } from '../data/options.js'
import { useI18n } from '../i18n/i18n.jsx'
import { CheckIcon } from '../ui/icons.jsx'

// A flat version of the customizer (src/ui/Customizer.jsx) for the admin's order form:
// every choice on one screen, no 3D house. It offers exactly the customizer's options,
// so whatever is picked here is a design the keeper's customizer understands.
export default function DesignPicker({ design, onChange }) {
  const { t } = useI18n()

  return (
    <div className="admin-design">
      {TABS.flatMap((tab) => tab.controls).map(({ field, type, options }) => (
        <div key={field} className="admin-design-control">
          <span className="field-label">{t(`field.${field}`)}</span>
          <div className="options">
            {options.map((value, i) => {
              const chosen = design[field] === value
              const choose = () => onChange({ ...design, [field]: value })
              return type === 'color' ? (
                <button
                  key={value}
                  type="button"
                  className="swatch small"
                  style={{ background: value }}
                  aria-pressed={chosen}
                  aria-label={`${t(`field.${field}`)} ${i + 1}`}
                  onClick={choose}
                >
                  {chosen && <CheckIcon />}
                </button>
              ) : (
                <button key={String(value)} type="button" className="choice small" aria-pressed={chosen} onClick={choose}>
                  {t(`${field}.${value}`)}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
