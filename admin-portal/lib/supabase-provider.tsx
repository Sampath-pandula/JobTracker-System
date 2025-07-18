'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClientComponentClient, type SupabaseClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

type SupabaseContext = {
  supabase: SupabaseClient
  loading: boolean
}

const Context = createContext<SupabaseContext | undefined>(undefined)

export interface SupabaseProviderProps {
  children: React.ReactNode
}

export default function SupabaseProvider({ children }: SupabaseProviderProps) {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const supabase = createClientComponentClient()

  useEffect(() => {
    const initialize = async () => {
      try {
        // Test the connection
        const { data, error } = await supabase.from('admin_users').select('count').limit(1)
        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" which is ok
          console.error('Supabase connection error:', error)
        }
      } catch (error) {
        console.error('Error initializing Supabase:', error)
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [supabase])

  return (
    <Context.Provider value={{ supabase, loading }}>
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