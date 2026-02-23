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
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { data, error }
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
