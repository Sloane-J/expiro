import type { User } from '@supabase/supabase-js'
import type React from 'react'
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from './supabase'

type AuthContextType = {
  user: User | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Validate session with the server
    const checkSession = async () => {
      try {
        // getUser() validates the JWT with Supabase
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error || !user) {
          await supabase.auth.signOut()
          setUser(null)
        } else {
          setUser(user)
        }
      } catch {
        await supabase.auth.signOut()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setUser(session.user)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
