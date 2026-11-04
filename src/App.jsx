import { lazy, Suspense } from 'react'
import Landing from './pages/Landing.jsx'
import { usePath } from './router.jsx'
import { loadAppTexts } from './i18n/i18n.jsx'

// The 3D town (three.js) and the sign-in page (the database client) are big,
// so each is only downloaded when someone opens it, together with the texts beyond the landing page.
// The landing page stays small and fast, even on budget phones.
function lazyPage(load) {
  return lazy(() => Promise.all([load(), loadAppTexts()]).then(([page]) => page))
}
const TownApp = lazyPage(() => import('./TownApp.jsx'))
const SignIn = lazyPage(() => import('./pages/SignIn.jsx'))
const CardPage = lazyPage(() => import('./card/CardPage.jsx'))
const AdminPage = lazyPage(() => import('./admin/AdminPage.jsx'))
const LegalPage = lazyPage(() => import('./legal/LegalPage.jsx'))
const MapPage = lazyPage(() => import('./map/MapPage.jsx'))
const StreetVisit = lazyPage(() => import('./map/StreetVisit.jsx'))

export default function App() {
  const path = usePath()

  // The town map. Nothing links here yet: it opens once there are several full streets.
  // The map itself is a separate download from the 3D street it leads to, so it stays light.
  if (path === '/map' || path === '/map/') {
    return (
      <Suspense fallback={null}>
        <MapPage />
      </Suspense>
    )
  }
  if (path.startsWith('/map/')) {
    const street = path.slice('/map/'.length).split('/')[0]
    return (
      <Suspense fallback={<div className="app" />}>
        <StreetVisit key={street} slug={street} />
      </Suspense>
    )
  }

  if (path === '/admin') {
    return (
      <Suspense fallback={null}>
        <AdminPage />
      </Suspense>
    )
  }

  if (path === '/terms' || path === '/privacy') {
    return (
      <Suspense fallback={null}>
        <LegalPage which={path.slice(1)} />
      </Suspense>
    )
  }

  if (path === '/signin') {
    return (
      <Suspense fallback={null}>
        <SignIn />
      </Suspense>
    )
  }

  // /town is the demo street. /h/<code> is someone's house - that address is printed
  // on QR cards and keychains, so it must never change.
  if (path === '/town' || path.startsWith('/h/')) {
    // "/h/abcd234567/" → "ABCD234567". Codes only use capital letters, so a hand-typed
    // lowercase link still works. "/h/<code>/inside" is the room inside the same house.
    const [codePart, page] = path.startsWith('/h/') ? path.slice(3).split('/') : []
    const houseCode = codePart ? codePart.toUpperCase() : null
    // The printable card is a plain page: no 3D town needed.
    if (houseCode && page === 'card') {
      return (
        <Suspense fallback={null}>
          <CardPage code={houseCode} />
        </Suspense>
      )
    }
    return (
      <Suspense fallback={<div className="app" />}>
        {/* key: going from one house to another starts fresh instead of reusing the old one.
            Stepping inside the same house keeps it, so nothing loads twice. */}
        <TownApp key={houseCode ?? 'demo'} houseCode={houseCode} inside={page === 'inside'} />
      </Suspense>
    )
  }

  return <Landing />
}
