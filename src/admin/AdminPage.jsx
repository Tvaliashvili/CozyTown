import { useEffect, useState } from 'react'
import { checkIsAdmin, loadAllHouses, loadStreets } from '../data/admin.js'
import { useSession } from '../lib/useSession.js'
import { Link } from '../router.jsx'
import { hideLoadingScreen } from '../ui/loadingScreen.js'
import { BackIcon } from '../ui/icons.jsx'
import HouseList from './HouseList.jsx'
import NewOrder from './NewOrder.jsx'
import './admin.css'

// /admin: where the founder turns manual orders (Instagram, Facebook, the form) into houses,
// prints their cards, and looks after them afterwards.
// Only for admins, so it's in English only, to keep it small. Style names in the
// design picker still follow the site's language, because they come from the customizer.
export default function AdminPage() {
  const session = useSession()
  // undefined = still checking
  const [isAdmin, setIsAdmin] = useState(undefined)
  // 'loading' | 'failed' | 'ready'
  const [status, setStatus] = useState('loading')
  const [streets, setStreets] = useState([])
  const [houses, setHouses] = useState([])

  useEffect(hideLoadingScreen, [])

  useEffect(() => {
    if (session === undefined) return
    if (session === null) {
      setIsAdmin(false)
      return
    }
    checkIsAdmin().then(setIsAdmin).catch(() => setIsAdmin(false))
  }, [session])

  // Called again after every change, so the list always shows what the database has.
  function reload() {
    return Promise.all([loadStreets(), loadAllHouses()])
      .then(([foundStreets, foundHouses]) => {
        setStreets(foundStreets)
        setHouses(foundHouses)
        setStatus('ready')
      })
      .catch(() => setStatus('failed'))
  }

  useEffect(() => {
    if (isAdmin) reload()
  }, [isAdmin])

  let content
  if (isAdmin === undefined || (isAdmin && status === 'loading')) {
    content = <p role="status">Loading…</p>
  } else if (!isAdmin) {
    content = (
      <div className="admin-box">
        <p>This page is for Cozy Town admins. Sign in with an admin account first.</p>
        <Link to="/signin" className="big-button accent">Sign in</Link>
      </div>
    )
  } else if (status === 'failed') {
    content = (
      <div className="admin-box" role="alert">
        <p>Couldn't reach the database. Check the internet connection.</p>
        <button type="button" className="big-button accent" onClick={reload}>Try again</button>
      </div>
    )
  } else {
    content = (
      <>
        <NewOrder streets={streets} houses={houses} onCreated={reload} />
        <HouseList streets={streets} houses={houses} onChanged={reload} />
      </>
    )
  }

  return (
    <div className="admin-page">
      <header className="admin-top">
        <Link to="/signin" className="pill-button">
          <BackIcon />
          Account
        </Link>
        {session && <span className="admin-who">{session.user.email}</span>}
      </header>
      <h1>Admin</h1>
      {content}
    </div>
  )
}
