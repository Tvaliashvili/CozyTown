import { useRef, useState } from 'react'
import Town from './scene/Town.jsx'
import LanguageToggle from './ui/LanguageToggle.jsx'
import Customizer from './ui/Customizer.jsx'
import { hideLoadingScreen } from './ui/loadingScreen.js'
import { useI18n } from './i18n/i18n.jsx'
import { Link } from './router.jsx'
import { BackIcon, PersonIcon, SlideIcon } from './ui/icons.jsx'

// The street screen, shared by the demo street (/town) and real houses (/h/<code>).
//
// canEdit: tapping the house opens the decorating panel. Otherwise it's just for looking.
// label: { title, text } shown in the bubble above the house (text is optional).
// bottom: replaces the "slide your finger" hint at the bottom, e.g. with a button.
// onFinish, saveFailed, onDoneEditing: passed on to the decorating panel (real houses only).
// onEnter: when you can't decorate, tapping the house (or its label) calls this to step inside.
// lanterns: how many visitor lanterns glow in the garden.
// showAccount: a button to the account page (where you can sign out). For keepers.
// focusHouse: a panel in "bottom" (like the lantern screen) covers part of the street, so the
// camera comes close and frames the house in the space left over, like it does for decorating.
export default function StreetView({
  plot,
  design,
  lanterns = 0,
  showAccount = false,
  focusHouse = false,
  neighbours,
  onChange,
  canEdit,
  label,
  bottom,
  onFinish,
  saveFailed,
  onDoneEditing,
  onEnter,
}) {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  // The 3D scene moves this label every frame so it floats above the house.
  const labelRef = useRef(null)

  // If the design gets locked while the panel is open, the panel simply disappears.
  const showPanel = editing && canEdit
  // The decorating panel or another panel (focusHouse) is covering part of the street.
  const covered = showPanel || focusHouse

  // What tapping the house does: open the decorating panel, step inside, or nothing.
  const onTapHouse = canEdit ? () => setEditing(true) : onEnter

  function closePanel() {
    setEditing(false)
    onDoneEditing?.()
  }

  return (
    <div className={covered ? 'app editing' : 'app'}>
      <Town
        myPlot={plot}
        myDesign={design}
        myLanterns={lanterns}
        neighbours={neighbours}
        editing={covered}
        tallPanel={focusHouse}
        onSelectMine={onTapHouse}
        labelRef={labelRef}
        onReady={hideLoadingScreen}
      />

      {!covered &&
        (onTapHouse ? (
          <button ref={labelRef} className="house-label" onClick={onTapHouse}>
            <LabelBubble label={label} />
          </button>
        ) : (
          <div ref={labelRef} className="house-label static">
            <LabelBubble label={label} />
          </div>
        ))}

      <header className="top-bar">
        <div className="top-bar-title">
          <Link to="/" className="pill-button" aria-label={t('street.home')}>
            <BackIcon />
          </Link>
          <div>
            <h1>
              <Link to="/">{t('appName')}</Link>
            </h1>
            <p>{t('tagline')}</p>
          </div>
        </div>
        <div className="top-bar-buttons">
          {/* Opens the sign-in page, which shows who's signed in and has "Sign out".
              Not a sign-out button right here: one accidental tap would lock a grandparent out,
              and there's no password-reset email yet. */}
          {showAccount && (
            <Link to="/signin" className="pill-button" aria-label={t('street.account')}>
              <PersonIcon />
            </Link>
          )}
          <LanguageToggle />
        </div>
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
