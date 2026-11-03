import { useEffect, useRef, useState } from 'react'
import Town from './scene/Town.jsx'
import LanguageToggle from './ui/LanguageToggle.jsx'
import Customizer from './ui/Customizer.jsx'
import { loadDesign, saveDesign } from './data/design.js'
import { useI18n } from './i18n/i18n.jsx'
import { Link } from './router.jsx'
import { SlideIcon } from './ui/icons.jsx'

// The loading screen lives in index.html so it shows before any JavaScript arrives.
function hideLoadingScreen() {
  const screen = document.getElementById('boot')
  if (!screen) return
  screen.classList.add('hidden')
  setTimeout(() => screen.remove(), 600)
}

// The 3D street with your house and the decorating panel.
// For now every visitor sees the demo house saved in their own browser;
// loading a real house from the database by its /h/<code> comes next.
export default function TownApp() {
  const { t } = useI18n()
  const [design, setDesign] = useState(loadDesign)
  const [editing, setEditing] = useState(false)
  // The 3D scene moves this label every frame so it floats above your house.
  const labelRef = useRef(null)

  // Every change is saved straight away, so nothing is lost on reload.
  useEffect(() => {
    saveDesign(design)
  }, [design])

  return (
    <div className={editing ? 'app editing' : 'app'}>
      <Town
        myDesign={design}
        editing={editing}
        onSelectMine={() => setEditing(true)}
        labelRef={labelRef}
        onReady={hideLoadingScreen}
      />

      {!editing && (
        <button ref={labelRef} className="house-label" onClick={() => setEditing(true)}>
          <span className="house-label-bubble">
            <strong>{t('yourHouse')}</strong>
            <span>{t('tapToDecorate')}</span>
          </span>
        </button>
      )}

      <header className="top-bar">
        <div>
          <h1>
            <Link to="/">{t('appName')}</Link>
          </h1>
          <p>{t('tagline')}</p>
        </div>
        <LanguageToggle />
      </header>

      {editing ? (
        <Customizer design={design} onChange={setDesign} onClose={() => setEditing(false)} />
      ) : (
        <p className="hint">
          <SlideIcon />
          {t('dragHint')}
        </p>
      )}
    </div>
  )
}
