import { lazy, Suspense } from 'react'
import Landing from './pages/Landing.jsx'
import { usePath } from './router.jsx'

// The 3D town (three.js) and the sign-in page (the database client) are big,
// so each is only downloaded when someone opens it.
// The landing page stays small and fast, even on budget phones.
const TownApp = lazy(() => import('./TownApp.jsx'))
const SignIn = lazy(() => import('./pages/SignIn.jsx'))
const CardPage = lazy(() => import('./card/CardPage.jsx'))
const AdminPage = lazy(() => import('./admin/AdminPage.jsx'))

export default function App() {
  const path = usePath()

  if (path === '/admin') {
    return (
      <Suspense fallback={null}>
        <AdminPage />
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
