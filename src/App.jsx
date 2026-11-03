import { lazy, Suspense } from 'react'
import Landing from './pages/Landing.jsx'
import { usePath } from './router.jsx'

// The 3D town (three.js) and the sign-in page (the database client) are big,
// so each is only downloaded when someone opens it.
// The landing page stays small and fast, even on budget phones.
const TownApp = lazy(() => import('./TownApp.jsx'))
const SignIn = lazy(() => import('./pages/SignIn.jsx'))

export default function App() {
  const path = usePath()

  if (path === '/signin') {
    return (
      <Suspense fallback={null}>
        <SignIn />
      </Suspense>
    )
  }

  // /town is the demo street. /h/<code> is someone's house — that address is printed
  // on QR cards and keychains, so it must never change.
  if (path === '/town' || path.startsWith('/h/')) {
    return (
      <Suspense fallback={<div className="app" />}>
        <TownApp />
      </Suspense>
    )
  }

  return <Landing />
}
