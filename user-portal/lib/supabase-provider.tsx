'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClientComponentClient, type SupabaseClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/auth-helpers-nextjs'

type SupabaseContext = {
  supabase: SupabaseClient
  user: User | null
  loading: boolean
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export interface SupabaseProviderProps {
  children: React.ReactNode
}

export default function SupabaseProvider({ children }: SupabaseProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          console.error('Error getting user:', error)
          setUser(null)
        } else {
          setUser(user)
        }
      } catch (error) {
        console.error('Error in getUser:', error)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        setLoading(false)

        if (event === 'SIGNED_IN' && session?.user) {
          // User signed in, redirect to dashboard if on auth pages
          if (window.location.pathname.startsWith('/auth')) {
            router.push('/dashboard')
          }
          router.refresh()
        }

        if (event === 'SIGNED_OUT') {
          // User signed out, redirect to home if on protected pages
          if (window.location.pathname.startsWith('/dashboard')) {
            router.push('/')
          }
          router.refresh()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [router, supabase.auth])

  return (
    <Context.Provider value={{ supabase, user, loading }}>
      {children}
    </Context.Provider>
  )
}

export const useSupabase = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useSupabase must be used inside SupabaseProvider')
  }
  return context
}

export { SupabaseProvider }