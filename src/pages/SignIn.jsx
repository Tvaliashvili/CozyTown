import { useEffect, useState } from 'react'
import { Link, navigate } from '../router.jsx'
import { supabase } from '../lib/supabase.js'
import { useSession } from '../lib/useSession.js'
import { useI18n } from '../i18n/i18n.jsx'
import LanguageToggle from '../ui/LanguageToggle.jsx'
import { BackIcon, EyeIcon, EyeOffIcon, KeyIcon, LockIcon } from '../ui/icons.jsx'
import './pages.css'

// Turns the database's error into a friendly message.
// The English texts come from claim_house() in supabase/migrations - keep them in step.
function claimErrorKey(message) {
  if (message.includes('No house')) return 'signin.error.notFound'
  if (message.includes('already claimed')) return 'signin.error.claimed'
  if (message.includes('already used')) return 'signin.error.inviteUsed'
  if (message.includes('expired')) return 'signin.error.inviteExpired'
  if (message.includes('already the keeper')) return 'signin.error.ownHouse'
  return 'signin.error.generic'
}

// Same idea for Supabase's sign-in errors. Newer Supabase sends a short code; older text is a fallback.
function accountErrorKey(error) {
  const code = error.code ?? ''
  const message = error.message ?? ''
  if (code === 'invalid_credentials' || message.includes('Invalid login')) return 'signin.error.wrongPassword'
  if (code === 'user_already_exists' || message.includes('already registered')) return 'signin.error.exists'
  if (code === 'weak_password' || message.includes('Password should')) return 'signin.error.weakPassword'
  if (code === 'email_address_invalid' || message.includes('invalid format')) return 'signin.error.badEmail'
  return 'signin.error.generic'
}

export default function SignIn() {
  const { t } = useI18n()
  const session = useSession()
  // Most people arriving here are opening a gift for the first time, so start on "create account".
  const [mode, setMode] = useState('signUp')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [busy, setBusy] = useState(false)
  const [accountError, setAccountError] = useState(null)
  const [houses, setHouses] = useState([])
  // A keeper's invite link (/signin?code=...) brings the helper's code along, already filled in.
  const [codeFromLink] = useState(() => new URLSearchParams(window.location.search).get('code') ?? '')
  const [giftCode, setGiftCode] = useState(codeFromLink)
  const [opening, setOpening] = useState(false)
  const [errorKey, setErrorKey] = useState(null)

  // Keepers (and helpers) who already have a house get a button to open it straight away.
  useEffect(() => {
    if (!session) {
      setHouses([])
      return
    }
    supabase.rpc('my_houses').then(({ data }) => setHouses(data ?? []))
  }, [session])

  // Admins also get a link to the admin page. Only they see it, so it's in English only.
  const [isAdmin, setIsAdmin] = useState(false)
  useEffect(() => {
    if (!session) {
      setIsAdmin(false)
      return
    }
    supabase.rpc('is_admin').then(({ data }) => setIsAdmin(data === true))
  }, [session])

  // Email + password for now. We don't send a "confirm your email" message yet (no email service),
  // so Supabase signs people in straight away. Once our own email is set up, we can add confirmation
  // and "forgot password" links.
  async function submitAccount(event) {
    event.preventDefault()
    setAccountError(null)
    setBusy(true)
    const credentials = { email: email.trim(), password }
    const { error } = mode === 'signUp'
      ? await supabase.auth.signUp(credentials)
      : await supabase.auth.signInWithPassword(credentials)
    setBusy(false)
    if (error) {
      setAccountError(accountErrorKey(error))
      return
    }
    // useSession() notices the new session and the page switches to "Signed in as…".
    setPassword('')
  }

  function switchMode() {
    setMode(mode === 'signUp' ? 'signIn' : 'signUp')
    setAccountError(null)
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
  // The gift code is entered only once. Keepers who already have a house just tap "Open" in step 1,
  // so for them the code box stays tucked away behind a small link (for a second gift).
  const [wantsAnotherGift, setWantsAnotherGift] = useState(Boolean(codeFromLink))
  const showGiftForm = !signedIn || houses.length === 0 || wantsAnotherGift

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
                  {t('signin.openHouse')} {house.title || (house.is_keeper ? t('yourHouse') : t('house.aCozyHouse'))}
                </Link>
              ))}
              {isAdmin && (
                <Link to="/admin" className="big-button soft">Admin page</Link>
              )}
              <button type="button" className="text-button" onClick={() => supabase.auth.signOut()}>
                {t('signin.signOut')}
              </button>
            </>
          ) : (
            <form className="account-form" onSubmit={submitAccount}>
              <label htmlFor="email" className="small">{t('signin.email')}</label>
              <input
                id="email"
                className="text-input"
                type="email"
                autoComplete="email"
                inputMode="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <label htmlFor="password" className="small">
                {t('signin.password')}
                {mode === 'signUp' && <> · {t('signin.passwordHint')}</>}
              </label>
              <div className="password-box">
                <input
                  id="password"
                  className="text-input"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signUp' ? 'new-password' : 'current-password'}
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                {/* Typing a password blind is hard on a phone, especially for grandparents. */}
                <button
                  type="button"
                  className="eye-button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? t('signin.hidePassword') : t('signin.showPassword')}
                  title={showPassword ? t('signin.hidePassword') : t('signin.showPassword')}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {accountError && <p className="error" role="alert">{t(accountError)}</p>}
              {mode === 'signUp' && <AgreeLine />}
              <button type="submit" className="big-button accent" disabled={session === undefined || busy}>
                {busy ? t('signin.working') : mode === 'signUp' ? t('signin.createAccount') : t('signin.logIn')}
              </button>
              <button type="button" className="text-button" onClick={switchMode}>
                {mode === 'signUp' ? t('signin.haveAccount') : t('signin.newHere')}
              </button>
              {mode === 'signIn' && <p className="small">{t('signin.forgot')}</p>}
              <p className="small">{t('signin.keeperHint')}</p>
            </form>
          )}
        </section>

        {!showGiftForm && (
          <button type="button" className="text-button" onClick={() => setWantsAnotherGift(true)}>
            {t('signin.anotherGift')}
          </button>
        )}

        {showGiftForm && <form className="card signin-step" onSubmit={claimGift}>
          <h2><span className="step-badge">2</span>{codeFromLink ? t('signin.step2Invite') : t('signin.step2')}</h2>
          {codeFromLink && <p className="signin-invited">{t(signedIn ? 'signin.invitedSignedIn' : 'signin.invited')}</p>}
          {/* The box below stays locked until step 1 is done, so say so right at the top. */}
          {!signedIn && (
            <p className="signin-locked">
              <LockIcon />
              {t('signin.signInFirst')}
            </p>
          )}
          <label htmlFor="gift-code" className="small">{codeFromLink ? t('signin.inviteCodeHint') : t('signin.codeHint')}</label>
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
            {opening ? t('signin.opening') : codeFromLink ? t('signin.join') : t('signin.open')}
          </button>
        </form>}

        <p className="small centered">{t('signin.visitHint')}</p>
      </main>
    </div>
  )
}

// "By creating an account, you agree to our terms of use and privacy notice", with both as links.
// The sentence is one text with {terms} and {privacy} in it, because Georgian word order differs.
function AgreeLine() {
  const { t } = useI18n()
  const links = {
    terms: <Link key="terms" to="/terms">{t('signin.agreeTerms')}</Link>,
    privacy: <Link key="privacy" to="/privacy">{t('signin.agreePrivacy')}</Link>,
  }
  const parts = t('signin.agree').split(/\{(terms|privacy)\}/)
  return <p className="small signin-agree">{parts.map((part) => links[part] ?? part)}</p>
}
