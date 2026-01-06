import { supabase } from './supabase'

export async function signUp(email: string, password: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // This ensures the session is established immediately after sign up 
      // if email confirmation is turned off in Supabase settings
      emailRedirectTo: window.location.origin,
    }
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
  // Clear any potential hanging data in local storage
  localStorage.clear() 
  return { error }
}

/**
 * Enhanced getCurrentUser
 * Using getSession() first is faster, but getUser() validates with the server.
 * If the JWT is expired, getSession() will try to use the refresh_token automatically.
 */
export async function getCurrentUser() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  if (sessionError || !session) {
    return null
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) return null
  
  return user
}

/**
 * Add this listener helper:
 * Use this in your App.tsx to catch "SIGNED_OUT" or "TOKEN_REFRESHED" events
 */
export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}