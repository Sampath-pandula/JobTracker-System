'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useSupabase } from '@/lib/supabase-provider'
import toast from 'react-hot-toast'

interface AdminUser {
  id: string
  email: string
  role: string
  created_at: string
  last_login?: string
}

type AdminAuthContext = {
  adminUser: AdminUser | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isAuthenticated: boolean
}

const Context = createContext<AdminAuthContext | undefined>(undefined)

export interface AdminAuthProviderProps {
  children: React.ReactNode
}

// Admin credentials - in production, this should be more secure
const ADMIN_CREDENTIALS = [
  { email: 'admin@jobtracker.com', password: 'AdminSecure123!', role: 'super_admin' },
  { email: 'manager@jobtracker.com', password: 'ManagerSecure123!', role: 'admin' },
]

export default function AdminAuthProvider({ children }: AdminAuthProviderProps) {
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null)
  const [loading, setLoading] = useState(true)
  const { supabase } = useSupabase()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkAuthStatus()
  }, [])

  useEffect(() => {
    // Redirect to login if not authenticated and not on login page
    if (!loading && !adminUser && pathname !== '/admin/login') {
      router.push('/admin/login')
    }
  }, [adminUser, loading, pathname, router])

  const checkAuthStatus = async () => {
    try {
      const stored = localStorage.getItem('admin_session')
      if (stored) {
        const session = JSON.parse(stored)
        const now = new Date().getTime()
        
        // Check if session is still valid (24 hours)
        if (session.expires > now) {
          setAdminUser(session.user)
          await updateLastLogin(session.user.email)
        } else {
          localStorage.removeItem('admin_session')
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error)
      localStorage.removeItem('admin_session')
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      // Check credentials
      const admin = ADMIN_CREDENTIALS.find(
        cred => cred.email === email && cred.password === password
      )

      if (!admin) {
        throw new Error('Invalid credentials')
      }

      // Create admin user object
      const adminUser: AdminUser = {
        id: `admin_${admin.email.split('@')[0]}`,
        email: admin.email,
        role: admin.role,
        created_at: new Date().toISOString(),
        last_login: new Date().toISOString(),
      }

      // Store session (expires in 24 hours)
      const session = {
        user: adminUser,
        expires: new Date().getTime() + (24 * 60 * 60 * 1000),
      }
      localStorage.setItem('admin_session', JSON.stringify(session))

      // Update admin record in database
      await upsertAdminUser(adminUser)
      await updateLastLogin(adminUser.email)

      setAdminUser(adminUser)
      toast.success('Welcome back, admin!')
      router.push('/admin/dashboard')
    } catch (error: any) {
      console.error('Admin sign in error:', error)
      throw new Error(error.message || 'Failed to sign in')
    }
  }

  const signOut = async () => {
    try {
      localStorage.removeItem('admin_session')
      setAdminUser(null)
      toast.success('Signed out successfully')
      router.push('/admin/login')
    } catch (error: any) {
      console.error('Admin sign out error:', error)
      throw new Error('Failed to sign out')
    }
  }

  const upsertAdminUser = async (adminUser: AdminUser) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .upsert({
          id: adminUser.id,
          email: adminUser.email,
          role: adminUser.role,
          created_at: adminUser.created_at,
        }, {
          onConflict: 'email'
        })

      if (error) {
        console.error('Error upserting admin user:', error)
      }
    } catch (error) {
      console.error('Error in upsertAdminUser:', error)
    }
  }

  const updateLastLogin = async (email: string) => {
    try {
      const { error } = await supabase
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('email', email)

      if (error) {
        console.error('Error updating last login:', error)
      }
    } catch (error) {
      console.error('Error in updateLastLogin:', error)
    }
  }

  const isAuthenticated = !!adminUser

  return (
    <Context.Provider value={{
      adminUser,
      loading,
      signIn,
      signOut,
      isAuthenticated,
    }}>
      {children}
    </Context.Provider>
  )
}

export const useAdminAuth = () => {
  const context = useContext(Context)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used inside AdminAuthProvider')
  }
  return context
}

export { AdminAuthProvider }