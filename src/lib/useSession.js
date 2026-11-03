import { useEffect, useState } from 'react'
import { supabase } from './supabase.js'

// Who is signed in. undefined = still checking, null = nobody, otherwise the Supabase session.
export function useSession() {
  const [session, setSession] = useState(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    // Also fires when someone signs in or out.
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  return session
}
