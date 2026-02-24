import { supabase } from './supabase'

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Ensures session is established immediately
      // if email confirmation is disabled in Supabase
      emailRedirectTo: window.location.origin,
    },
  })

  return { data, error }
}

export async function signIn(email: string, password: string) {
  // 1. Sign in with Supabase auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) return { data, error }

  // 2. Check if user is approved
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('is_approved')
    .eq('id', data.user.id)
    .single()

  if (profileError || !profile) {
    await supabase.auth.signOut()
    return {
      data: null,
      error: { message: 'Account not found. Please contact the admin.' },
    }
  }

  if (!profile.is_approved) {
    await supabase.auth.signOut()
    return {
      data: null,
      error: {
        message: 'Your account is pending approval. Please wait for the admin to approve your access.',
      },
    }
  }

  return { data, error: null }
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()

  // Clear any potential hanging auth data
  localStorage.clear()

  return { error }
}

/**
 * Enhanced getCurrentUser
 *
 * - getSession() is fast and handles token refresh
 * - getUser() validates the JWT with the server
 */
export async function getCurrentUser() {
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session) {
    return null
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    return null
  }

  return user
}

/**
 * Auth state change helper
 *
 * Useful for listening to:
 * - SIGNED_OUT
 * - TOKEN_REFRESHED
 */
export function onAuthStateChange(
  callback: (event: string, session: any) => void
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}
