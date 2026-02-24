import { supabase } from './supabase'

export async function signUp(email: string, password: string, phone: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
    },
  })

  if (error) return { data, error }

  if (data.user) {
    await supabase
      .from('user_profiles')
      .update({ phone, email })
      .eq('id', data.user.id)
  }

  return { data, error: null }
}

export async function signIn(email: string, password: string) {
  // 1. Sign in with Supabase auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) return { data, error }

  // 2. Check approval status
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('is_approved')
    .eq('id', data.user.id)
    .single()

  // DEBUG: Remove after fixing
  console.log('Profile check:', { profile, profileError, userId: data.user.id })

  if (profileError || !profile) {
    await supabase.auth.signOut()
    return {
      data: null,
      error: {
        message: 'Your account is pending approval. Please wait for the admin to approve your access.',
      },
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
  localStorage.clear()
  return { error }
}

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

export function onAuthStateChange(
  callback: (event: string, session: any) => void
) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session)
  })
}