'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  UsersIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  DocumentTextIcon,
  CalendarIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline'
import { useSupabase } from '@/lib/supabase-provider'
import { useAdminAuth } from '@/lib/admin-auth-provider'
import { format, formatDistanceToNow } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'
import toast from 'react-hot-toast'

interface User {
  id: string
  email: string
  created_at: string
  last_login?: string
  is_active: boolean
  user_metadata: any
  applicationCount: number
  lastApplicationDate?: string
  successRate: number
  applicationTypes: { [key: string]: number }
  statusDistribution: { [key: string]: number }
}

interface UserStats {
  totalUsers: number
  activeUsers: number
  newUsersThisMonth: number
  averageApplicationsPerUser: number
  userGrowthData: { month: string; users: number }[]
  applicationDistribution: { range: string; users: number }[]
}

const APPLICATION_RANGES = [
  { min: 0, max: 0, label: '0 applications' },
  { min: 1, max: 10, label: '1-10 applications' },
  { min: 11, max: 25, label: '11-25 applications' },
  { min: 26, max: 50, label: '26-50 applications' },
  { min: 51, max: 100, label: '51-100 applications' },
  { min: 101, max: Infinity, label: '100+ applications' },
]

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [filteredUsers, setFilteredUsers] = useState<User[]>([])
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'last_login' | 'applications' | 'email'>('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  
  const { supabase } = useSupabase()
  const { adminUser } = useAdminAuth()

  useEffect(() => {
    if (adminUser) {
      loadUsers()
    }
  }, [adminUser])

  useEffect(() => {
    filterAndSortUsers()
  }, [users, searchTerm, statusFilter, sortBy, sortOrder])

  const loadUsers = async () => {
    try {
      setLoading(true)

      // Fetch all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Fetch applications for each user
      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select('user_id, status, portal_used, application_type, date_applied, created_at')

      if (appsError) throw appsError

      // Process user data with application statistics
      const processedUsers = usersData.map(user => {
        const userApplications = applicationsData.filter(app => app.user_id === user.id)
        
        const statusDistribution: { [key: string]: number } = {}
        const applicationTypes: { [key: string]: number } = {}
        
        userApplications.forEach(app => {
          statusDistribution[app.status] = (statusDistribution[app.status] || 0) + 1
          if (app.application_type) {
            applicationTypes[app.application_type] = (applicationTypes[app.application_type] || 0) + 1
          }
        })

        const offers = statusDistribution.offer || 0
        const total = userApplications.length
        const successRate = total > 0 ? (offers / total) * 100 : 0

        const lastApplicationDate = userApplications.length > 0 
          ? Math.max(...userApplications.map(app => new Date(app.date_applied).getTime()))
          : undefined

        return {
          ...user,
          applicationCount: total,
          lastApplicationDate: lastApplicationDate ? new Date(lastApplicationDate).toISOString() : undefined,
          successRate,
          applicationTypes,
          statusDistribution,
        }
      })

      setUsers(processedUsers)
      calculateStats(processedUsers)
    } catch (error) {
      console.error('Error loading users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (userData: User[]) => {
    const now = new Date()
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    
    const totalUsers = userData.length
    const activeUsers = userData.filter(user => user.is_active).length
    const newUsersThisMonth = userData.filter(user => new Date(user.created_at) >= thisMonth).length
    const averageApplicationsPerUser = totalUsers > 0 ? 
      userData.reduce((sum, user) => sum + user.applicationCount, 0) / totalUsers : 0

    // User growth data (last 12 months)
    const userGrowthData = []
    for (let i = 11; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
      
      const usersInMonth = userData.filter(user => {
        const createdDate = new Date(user.created_at)
        return createdDate >= month && createdDate <= monthEnd
      }).length

      userGrowthData.push({
        month: format(month, 'MMM yyyy'),
        users: usersInMonth
      })
    }

    // Application distribution
    const applicationDistribution = APPLICATION_RANGES.map(range => ({
      range: range.label,
      users: userData.filter(user => 
        user.applicationCount >= range.min && user.applicationCount <= range.max
      ).length
    }))

    const stats: UserStats = {
      totalUsers,
      activeUsers,
      newUsersThisMonth,
      averageApplicationsPerUser,
      userGrowthData,
      applicationDistribution,
    }

    setStats(stats)
  }

  const filterAndSortUsers = () => {
    let filtered = [...users]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.user_metadata?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter === 'active') {
      filtered = filtered.filter(user => user.is_active)
    } else if (statusFilter === 'inactive') {
      filtered = filtered.filter(user => !user.is_active)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any = a[sortBy]
      let bValue: any = b[sortBy]

      if (sortBy === 'applications') {
        aValue = a.applicationCount
        bValue = b.applicationCount
      } else if (sortBy === 'created_at' || sortBy === 'last_login') {
        aValue = aValue ? new Date(aValue).getTime() : 0
        bValue = bValue ? new Date(bValue).getTime() : 0
      } else if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue?.toLowerCase() || ''
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredUsers(filtered)
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) throw error

      setUsers(prev => prev.map(user => 
        user.id === userId ? { ...user, is_active: !currentStatus } : user
      ))

      toast.success(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
    } catch (error) {
      console.error('Error updating user status:', error)
      toast.error('Failed to update user status')
    }
  }

  const exportUsers = () => {
    const csvContent = [
      ['Email', 'Created At', 'Last Login', 'Status', 'Applications', 'Success Rate'].join(','),
      ...filteredUsers.map(user => [
        user.email,
        format(new Date(user.created_at), 'yyyy-MM-dd'),
        user.last_login ? format(new Date(user.last_login), 'yyyy-MM-dd') : 'Never',
        user.is_active ? 'Active' : 'Inactive',
        user.applicationCount,
        `${user.successRate.toFixed(1)}%`
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users-export-${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              User Management
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage and monitor all registered users
            </p>
          </div>
          <button
            onClick={exportUsers}
            className="btn btn-secondary btn-md inline-flex items-center"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export Users
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="admin-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Total Users
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.totalUsers.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
                <UsersIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="admin-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Active Users
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.activeUsers.toLocaleString()}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}% of total
                </p>
              </div>
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
                <CheckCircleIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="admin-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  New This Month
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.newUsersThisMonth.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900">
                <CalendarIcon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="admin-card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Avg Apps/User
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.averageApplicationsPerUser.toFixed(1)}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900">
                <ChartBarIcon className="h-6 w-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Charts */}
      {stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="admin-card p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              User Growth (Last 12 Months)
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats.userGrowthData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="users"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="admin-card p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Users by Application Count
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.applicationDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="users" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="admin-card mb-6">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users by email or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary btn-md inline-flex items-center"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="form-input"
                  >
                    <option value="all">All Users</option>
                    <option value="active">Active Only</option>
                    <option value="inactive">Inactive Only</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="form-input"
                  >
                    <option value="created_at">Join Date</option>
                    <option value="last_login">Last Login</option>
                    <option value="applications">Application Count</option>
                    <option value="email">Email</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Order</label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                    className="form-input"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="admin-card">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No users found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Joined</th>
                  <th>Last Login</th>
                  <th>Applications</th>
                  <th>Success Rate</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.02 }}
                  >
                    <td>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {user.user_metadata?.full_name || user.email.split('@')[0]}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {user.email}
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="text-sm text-gray-900 dark:text-white">
                        {format(new Date(user.created_at), 'MMM dd, yyyy')}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                      </div>
                    </td>
                    <td>
                      {user.last_login ? (
                        <div>
                          <div className="text-sm text-gray-900 dark:text-white">
                            {format(new Date(user.last_login), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDistanceToNow(new Date(user.last_login), { addSuffix: true })}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">Never</span>
                      )}
                    </td>
                    <td>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.applicationCount}
                      </div>
                      {user.lastApplicationDate && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Last: {format(new Date(user.lastApplicationDate), 'MMM dd')}
                        </div>
                      )}
                    </td>
                    <td>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.successRate.toFixed(1)}%
                      </div>
                      {user.statusDistribution.offer > 0 && (
                        <div className="text-xs text-green-600 dark:text-green-400">
                          {user.statusDistribution.offer} offers
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => toggleUserStatus(user.id, user.is_active)}
                        className={`status-badge ${user.is_active ? 'user-active' : 'user-inactive'}`}
                      >
                        {user.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td>
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                          title="View Details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {filteredUsers.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Showing {filteredUsers.length} of {users.length} users
        </div>
      )}
    </div>
  )
}