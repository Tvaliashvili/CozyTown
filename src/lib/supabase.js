import { createClient } from '@supabase/supabase-js'

// The publishable key is safe in the browser: the database rules decide what each person may see.
// Both values come from .env.local (and from the hosting settings when the site is built online).
export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_KEY)
