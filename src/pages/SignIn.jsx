import { useEffect, useState } from 'react'
import { Link, navigate } from '../router.jsx'
import { supabase } from '../lib/supabase.js'
import { useSession } from '../lib/useSession.js'
import { useI18n } from '../i18n/i18n.jsx'
import LanguageToggle from '../ui/LanguageToggle.jsx'
import { BackIcon, KeyIcon } from '../ui/icons.jsx'
import './pages.css'

// Turns the database's error into a friendly message.
// The English texts come from claim_house() in supabase/migrations — keep them in step.
function claimErrorKey(message) {
  if (message.includes('No house')) return 'signin.error.notFound'
  if (message.includes('already claimed')) return 'signin.error.claimed'
  return 'signin.error.generic'
}

export default function SignIn() {
  const { t } = useI18n()
  const session = useSession()
  const [houses, setHouses] = useState([])
  const [giftCode, setGiftCode] = useState('')
  const [opening, setOpening] = useState(false)
  const [errorKey, setErrorKey] = useState(null)

  // Keepers who already have a house get a button to open it straight away.
  useEffect(() => {
    if (!session) {
      setHouses([])
      return
    }
    supabase
      .from('houses')
      .select('code, title')
      .eq('keeper_id', session.user.id) // admins can see every house, so only show their own
      .order('claimed_at')
      .then(({ data }) => setHouses(data ?? []))
  }, [session])

  function signInWithGoogle() {
    // Google sends them back to this page, already signed in.
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/signin` },
    })
  }

  async function claimGift(event) {
    event.preventDefault()
    setErrorKey(null)
    setOpening(true)
    const { data: houseCode, error } = await supabase.rpc('claim_house', { gift: giftCode })
    if (error) {
      setOpening(false)
      setErrorKey(claimErrorKey(error.message))
      return
    }
    navigate(`/h/${houseCode}`)
  }

  const signedIn = Boolean(session)

  return (
    <div className="signin">
      <div className="signin-sky">
        <img src="/art/signin-house.svg" alt="" />
      </div>

      <div className="signin-top">
        <Link to="/" className="pill-button glass"><BackIcon />{t('signin.back')}</Link>
        <LanguageToggle className="pill-button glass" />
      </div>
      <div className="signin-welcome">
        <h1>{t('signin.title')}</h1>
        <p>{t('signin.text')}</p>
      </div>

      <main className="sheet signin-sheet">
        <section className="card signin-step">
          <h2><span className="step-badge">1</span>{t('signin.step1')}</h2>
          {signedIn ? (
            <>
              <p className="small">
                {t('signin.signedInAs')} <strong>{session.user.email}</strong>
              </p>
              {houses.map((house) => (
                <Link key={house.code} to={`/h/${house.code}`} className="big-button accent">
                  {t('signin.openHouse')} {house.title || t('yourHouse')}
                </Link>
              ))}
              <button type="button" className="text-button" onClick={() => supabase.auth.signOut()}>
                {t('signin.signOut')}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="big-button google" onClick={signInWithGoogle} disabled={session === undefined}>
                <span className="google-mark" aria-hidden="true">G</span>
                {t('signin.google')}
              </button>
              <p className="small">{t('signin.keeperHint')}</p>
            </>
          )}
        </section>

        <form className="card signin-step" onSubmit={claimGift}>
          <h2><span className="step-badge">2</span>{t('signin.step2')}</h2>
          <label htmlFor="gift-code" className="small">{t('signin.codeHint')}</label>
          <input
            id="gift-code"
            className="code-input"
            type="text"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck="false"
            placeholder="ABCD-EFGH-JKMN"
            value={giftCode}
            onChange={(e) => setGiftCode(e.target.value)}
            disabled={!signedIn}
          />
          {errorKey && <p className="error" role="alert">{t(errorKey)}</p>}
          <button type="submit" className="big-button accent" disabled={!signedIn || !giftCode.trim() || opening}>
            <KeyIcon />
            {opening ? t('signin.opening') : t('signin.open')}
          </button>
          {!signedIn && <p className="small">{t('signin.signInFirst')}</p>}
        </form>

        <p className="small centered">{t('signin.visitHint')}</p>
      </main>
    </div>
  )
}
