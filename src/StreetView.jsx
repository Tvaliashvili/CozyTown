import { useRef, useState } from 'react'
import Town from './scene/Town.jsx'
import LanguageToggle from './ui/LanguageToggle.jsx'
import Customizer from './ui/Customizer.jsx'
import { hideLoadingScreen } from './ui/loadingScreen.js'
import { useI18n } from './i18n/i18n.jsx'
import { Link } from './router.jsx'
import { SlideIcon } from './ui/icons.jsx'

// The street screen, shared by the demo street (/town) and real houses (/h/<code>).
//
// canEdit: tapping the house opens the decorating panel. Otherwise it's just for looking.
// label: { title, text } shown in the bubble above the house (text is optional).
// bottom: replaces the "slide your finger" hint at the bottom, e.g. with a button.
// onFinish, saveFailed, onDoneEditing: passed on to the decorating panel (real houses only).
export default function StreetView({
  plot,
  design,
  neighbours,
  onChange,
  canEdit,
  label,
  bottom,
  onFinish,
  saveFailed,
  onDoneEditing,
}) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  // The 3D scene moves this label every frame so it floats above the house.
  const labelRef = useRef(null)

  // If the design gets locked while the panel is open, the panel simply disappears.
  const showPanel = editing && canEdit

  function closePanel() {
    setEditing(false)
    onDoneEditing?.()
  }

  return (
    <div className={showPanel ? 'app editing' : 'app'}>
      <Town
        myPlot={plot}
        myDesign={design}
        neighbours={neighbours}
        editing={showPanel}
        onSelectMine={canEdit ? () => setEditing(true) : undefined}
        labelRef={labelRef}
        onReady={hideLoadingScreen}
      />

      {!showPanel &&
        (canEdit ? (
          <button ref={labelRef} className="house-label" onClick={() => setEditing(true)}>
            <LabelBubble label={label} />
          </button>
        ) : (
          <div ref={labelRef} className="house-label static">
            <LabelBubble label={label} />
          </div>
        ))}

      <header className="top-bar">
        <div>
          <h1>
            <Link to="/">{t('appName')}</Link>
          </h1>
          <p>{t('tagline')}</p>
        </div>
        <LanguageToggle />
      </header>

      {showPanel ? (
        <Customizer design={design} onChange={onChange} onClose={closePanel} onFinish={onFinish} saveFailed={saveFailed} />
      ) : (
        bottom ?? (
          <p className="hint">
            <SlideIcon />
            {t('dragHint')}
          </p>
        )
      )}
    </div>
  )
}

function LabelBubble({ label }) {
  return (
    <span className="house-label-bubble">
      <strong>{label.title}</strong>
      {label.text && <span>{label.text}</span>}
    </span>
  )
}
