import { useEffect, useRef } from 'react'
import Town from './scene/Town.jsx'
import LanguageToggle from './ui/LanguageToggle.jsx'
import Customizer from './ui/Customizer.jsx'
import { hideLoadingScreen } from './ui/loadingScreen.js'
import { useI18n } from './i18n/i18n.jsx'
import { useBackState } from './lib/useBackState.js'
import { Link } from './router.jsx'
import { BackIcon, MapIcon, PersonIcon, ShareIcon, SlideIcon } from './ui/icons.jsx'

// The street screen, shared by the demo street (/town) and real houses (/h/<code>).
//
// canEdit: tapping the house opens the decorating panel. Otherwise it's just for looking.
// label: { title, text } shown in the bubble above the house (text is optional).
// bottom: replaces the "slide your finger" hint at the bottom, e.g. with a button.
// onFinish, saveFailed, onDoneEditing: passed on to the decorating panel (real houses only).
// onEnter: when you can't decorate, tapping the house (or its label) calls this to step inside.
// lanterns: how many visitor lanterns glow in the garden.
// showAccount: a button to the account page (where you can sign out). For keepers.
// onShare: a "Share your house" button in the top bar calls this. For keepers.
// focusHouse: a panel in "bottom" (like the lantern screen) covers part of the street, so the
// camera comes close and frames the house in the space left over, like it does for decorating.
// plot null: no house is singled out (walking down a street from the map), so no label either.
// subtitle: replaces the tagline in the top bar, e.g. with the street's name.
// backTo, backLabel, onBack: where the top bar's back button goes. The home page unless set.
// showMap: a button to the town map in the top bar. Not on a street reached from the map, where Back already leads there.
export default function StreetView({
  plot,
  design,
  lanterns = 0,
  showAccount = false,
  onShare,
  focusHouse = false,
  neighbours,
  signs,
  neighbourSigns,
  onChange,
  canEdit,
  label,
  bottom,
  onFinish,
  saveFailed,
  onDoneEditing,
  onEnter,
  subtitle,
  backTo = '/',
  backLabel,
  onBack,
  showMap = false,
}) {
  const { t } = useI18n()
  // useBackState: the phone's Back button closes the decorating panel, instead of leaving the street.
  const [editing, setEditing] = useBackState(false)
  // The 3D scene moves this label every frame so it floats above the house.
  const labelRef = useRef(null)

  // If the design gets locked while the panel is open, the panel closes.
  const showPanel = editing && canEdit
  useEffect(() => {
    if (editing && !canEdit) setEditing(false)
  }, [editing, canEdit])

  // Save the last taps right away when the panel closes, by its button or the phone's Back button.
  const wasEditing = useRef(false)
  useEffect(() => {
    if (wasEditing.current && !editing) onDoneEditing?.()
    wasEditing.current = editing
  }, [editing])
  // The decorating panel or another panel (focusHouse) is covering part of the street.
  const covered = showPanel || focusHouse

  // What tapping the house does: open the decorating panel, step inside, or nothing.
  const onTapHouse = canEdit ? () => setEditing(true) : onEnter

  return (
    <div className={covered ? 'app editing' : 'app'}>
      <Town
        myPlot={plot}
        myDesign={design}
        myLanterns={lanterns}
        neighbours={neighbours}
        mySigns={signs}
        neighbourSigns={neighbourSigns}
        editing={covered}
        tallPanel={focusHouse}
        onSelectMine={onTapHouse}
        labelRef={labelRef}
        onReady={hideLoadingScreen}
      />

      {!covered && label &&
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
          {/* onBack only when set: an empty onClick here would replace Link's own and reload the page. */}
          <Link to={backTo} className="pill-button" aria-label={backLabel ?? t('street.home')} {...(onBack && { onClick: onBack })}>
            <BackIcon />
          </Link>
          <div>
            <h1>
              <Link to="/">{t('appName')}</Link>
            </h1>
            {subtitle ? <p>{subtitle}</p> : <p className="top-bar-tagline">{t('tagline')}</p>}
          </div>
        </div>
        <div className="top-bar-buttons">
          {/* state: so the map's back arrow can step back to this house instead of going to the home page. */}
          {showMap && (
            <Link to="/map" state={{ fromHouse: true }} className="pill-button" aria-label={t('street.map')}>
              <MapIcon />
            </Link>
          )}
          {onShare && (
            <button type="button" className="pill-button" onClick={onShare} aria-label={t('share.button')}>
              <ShareIcon />
            </button>
          )}
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
        <Customizer design={design} onChange={onChange} onClose={() => setEditing(false)} onFinish={onFinish} saveFailed={saveFailed} />
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
