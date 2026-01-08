import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})

// Check session on load
supabase.auth.getSession().then(({ data: { session } }) => {
  if (!session && window.location.pathname !== '/login' && window.location.pathname !== '/') {
    alert('Session expired. Please log in again.')
    window.location.href = '/login'
  }
})

// Listen for auth changes
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
    if (!session && window.location.pathname !== '/login' && window.location.pathname !== '/') {
      alert('Session expired. Please log in again.')
      window.location.href = '/login'
    }
  }
})