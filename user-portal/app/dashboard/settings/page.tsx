'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  UserIcon,
  CogIcon,
  BellIcon,
  ShieldCheckIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'
import { useSupabase } from '@/lib/supabase-provider'
import { useTheme } from 'next-themes'
import toast from 'react-hot-toast'

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
})

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
})

type ProfileForm = z.infer<typeof profileSchema>
type PasswordForm = z.infer<typeof passwordSchema>

interface UserPreferences {
  emailNotifications: boolean
  pushNotifications: boolean
  weeklyDigest: boolean
  jobAlerts: boolean
  theme: 'light' | 'dark' | 'system'
  autoSync: boolean
  dataRetention: number
}

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences' | 'data'>('profile')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
  const [preferences, setPreferences] = useState<UserPreferences>({
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: true,
    jobAlerts: true,
    theme: 'system',
    autoSync: true,
    dataRetention: 365,
  })

  const { user, supabase } = useSupabase()
  const { theme, setTheme } = useTheme()

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
    },
  })

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  useEffect(() => {
    if (user) {
      loadUserData()
      loadPreferences()
    }
  }, [user])

  const loadUserData = () => {
    if (user?.user_metadata) {
      profileForm.setValue('firstName', user.user_metadata.first_name || '')
      profileForm.setValue('lastName', user.user_metadata.last_name || '')
    }
    profileForm.setValue('email', user?.email || '')
  }

  const loadPreferences = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('preferences')
        .eq('id', user.id)
        .single()

      if (error) throw error

      if (data?.preferences) {
        setPreferences({ ...preferences, ...data.preferences })
      }
    } catch (error) {
      console.error('Error loading preferences:', error)
    }
  }

  const onUpdateProfile = async (data: ProfileForm) => {
    setIsUpdatingProfile(true)
    
    try {
      const { error } = await supabase.auth.updateUser({
        email: data.email,
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          full_name: `${data.firstName} ${data.lastName}`,
        },
      })

      if (error) throw error

      toast.success('Profile updated successfully')
    } catch (error: any) {
      console.error('Profile update error:', error)
      toast.error(error.message || 'Failed to update profile')
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  const onUpdatePassword = async (data: PasswordForm) => {
    setIsUpdatingPassword(true)
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.newPassword,
      })

      if (error) throw error

      passwordForm.reset()
      toast.success('Password updated successfully')
    } catch (error: any) {
      console.error('Password update error:', error)
      toast.error(error.message || 'Failed to update password')
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  const updatePreferences = async (newPreferences: Partial<UserPreferences>) => {
    const updatedPreferences = { ...preferences, ...newPreferences }
    setPreferences(updatedPreferences)

    try {
      const { error } = await supabase
        .from('users')
        .update({ preferences: updatedPreferences })
        .eq('id', user.id)

      if (error) throw error

      toast.success('Preferences updated')
    } catch (error) {
      console.error('Error updating preferences:', error)
      toast.error('Failed to update preferences')
      // Revert on error
      setPreferences(preferences)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmation = prompt(
      'Are you sure you want to delete your account? This action cannot be undone. Type "DELETE" to confirm:'
    )

    if (confirmation !== 'DELETE') {
      return
    }

    try {
      // First delete all user data
      const { error: appsError } = await supabase
        .from('applications')
        .delete()
        .eq('user_id', user.id)

      if (appsError) throw appsError

      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id)

      if (userError) throw userError

      // Then delete auth user
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id)

      if (authError) throw authError

      toast.success('Account deleted successfully')
      
      // Sign out and redirect
      await supabase.auth.signOut()
    } catch (error: any) {
      console.error('Delete account error:', error)
      toast.error('Failed to delete account')
    }
  }

  const exportUserData = async () => {
    try {
      const { data: applications, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)

      if (error) throw error

      const userData = {
        profile: {
          email: user.email,
          created_at: user.created_at,
          user_metadata: user.user_metadata,
        },
        applications: applications || [],
        preferences,
        export_date: new Date().toISOString(),
      }

      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `job-tracker-data-${new Date().toISOString().split('T')[0]}.json`
      a.click()
      URL.revokeObjectURL(url)

      toast.success('Data exported successfully')
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export data')
    }
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'security', label: 'Security', icon: ShieldCheckIcon },
    { id: 'preferences', label: 'Preferences', icon: CogIcon },
    { id: 'data', label: 'Data & Privacy', icon: TrashIcon },
  ]

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Tab Navigation */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-700 dark:bg-primary-900 dark:text-primary-300'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white'
                }`}
              >
                <tab.icon className="h-5 w-5 mr-3" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="lg:col-span-3">
          {/* Profile Tab */}
          {activeTab === 'profile' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Profile Information
              </h2>

              <form onSubmit={profileForm.handleSubmit(onUpdateProfile)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="form-label">First Name</label>
                    <input
                      {...profileForm.register('firstName')}
                      type="text"
                      className="form-input"
                    />
                    {profileForm.formState.errors.firstName && (
                      <p className="form-error">{profileForm.formState.errors.firstName.message}</p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">Last Name</label>
                    <input
                      {...profileForm.register('lastName')}
                      type="text"
                      className="form-input"
                    />
                    {profileForm.formState.errors.lastName && (
                      <p className="form-error">{profileForm.formState.errors.lastName.message}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="form-label">Email Address</label>
                  <input
                    {...profileForm.register('email')}
                    type="email"
                    className="form-input"
                  />
                  {profileForm.formState.errors.email && (
                    <p className="form-error">{profileForm.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="btn btn-primary btn-md"
                  >
                    {isUpdatingProfile ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card p-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
                Security Settings
              </h2>

              <form onSubmit={passwordForm.handleSubmit(onUpdatePassword)} className="space-y-6">
                <div>
                  <label className="form-label">Current Password</label>
                  <div className="relative">
                    <input
                      {...passwordForm.register('currentPassword')}
                      type={showCurrentPassword ? 'text' : 'password'}
                      className="form-input pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {passwordForm.formState.errors.currentPassword && (
                    <p className="form-error">{passwordForm.formState.errors.currentPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">New Password</label>
                  <div className="relative">
                    <input
                      {...passwordForm.register('newPassword')}
                      type={showNewPassword ? 'text' : 'password'}
                      className="form-input pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {passwordForm.formState.errors.newPassword && (
                    <p className="form-error">{passwordForm.formState.errors.newPassword.message}</p>
                  )}
                </div>

                <div>
                  <label className="form-label">Confirm New Password</label>
                  <div className="relative">
                    <input
                      {...passwordForm.register('confirmPassword')}
                      type={showConfirmPassword ? 'text' : 'password'}
                      className="form-input pr-10"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                  {passwordForm.formState.errors.confirmPassword && (
                    <p className="form-error">{passwordForm.formState.errors.confirmPassword.message}</p>
                  )}
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="btn btn-primary btn-md"
                  >
                    {isUpdatingPassword ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Notifications */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Notifications
                </h3>
                <div className="space-y-4">
                  {[
                    { key: 'emailNotifications', label: 'Email Notifications', description: 'Receive email updates about your applications' },
                    { key: 'pushNotifications', label: 'Push Notifications', description: 'Get notified about application status changes' },
                    { key: 'weeklyDigest', label: 'Weekly Digest', description: 'Weekly summary of your job search activity' },
                    { key: 'jobAlerts', label: 'Job Alerts', description: 'Notifications about new job opportunities' },
                  ].map((setting) => (
                    <div key={setting.key} className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={preferences[setting.key as keyof UserPreferences] as boolean}
                        onChange={(e) => updatePreferences({ [setting.key]: e.target.checked })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                      />
                      <div>
                        <label className="text-sm font-medium text-gray-900 dark:text-white">
                          {setting.label}
                        </label>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {setting.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Theme */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Appearance
                </h3>
                <div>
                  <label className="form-label">Theme</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="form-input"
                  >
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="system">System</option>
                  </select>
                </div>
              </div>

              {/* Sync Settings */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Sync Settings
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      checked={preferences.autoSync}
                      onChange={(e) => updatePreferences({ autoSync: e.target.checked })}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded mt-1"
                    />
                    <div>
                      <label className="text-sm font-medium text-gray-900 dark:text-white">
                        Auto Sync
                      </label>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Automatically sync data between extension and dashboard
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Data Retention (days)</label>
                    <select
                      value={preferences.dataRetention}
                      onChange={(e) => updatePreferences({ dataRetention: Number(e.target.value) })}
                      className="form-input"
                    >
                      <option value={90}>90 days</option>
                      <option value={180}>6 months</option>
                      <option value={365}>1 year</option>
                      <option value={730}>2 years</option>
                      <option value={-1}>Forever</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Data & Privacy Tab */}
          {activeTab === 'data' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Data Export */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Data Export
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  Download a copy of all your data including applications, notes, and settings.
                </p>
                <button
                  onClick={exportUserData}
                  className="btn btn-secondary btn-md"
                >
                  Export My Data
                </button>
              </div>

              {/* Account Deletion */}
              <div className="card p-6 border-red-200 dark:border-red-800">
                <div className="flex items-start space-x-3">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600 mt-1" />
                  <div>
                    <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
                      Delete Account
                    </h3>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-4">
                      Permanently delete your account and all associated data. This action cannot be undone.
                    </p>
                    <button
                      onClick={handleDeleteAccount}
                      className="btn btn-danger btn-md"
                    >
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>

              {/* Privacy Information */}
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Privacy Information
                </h3>
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-start space-x-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>Your data is encrypted and stored securely</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>We never share your personal information with third parties</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>You can export or delete your data at any time</span>
                  </div>
                  <div className="flex items-start space-x-2">
                    <CheckCircleIcon className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>We comply with GDPR and other privacy regulations</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}