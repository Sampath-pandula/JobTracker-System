'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  UsersIcon,
  DocumentTextIcon,
  ChartBarIcon,
  ClockIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  GlobeAltIcon,
  BuildingOfficeIcon,
} from '@heroicons/react/24/outline'
import { useSupabase } from '@/lib/supabase-provider'
import { useAdminAuth } from '@/lib/admin-auth-provider'
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from 'date-fns'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts'

interface SystemStats {
  totalUsers: number
  totalApplications: number
  activeUsers: number
  newUsersThisMonth: number
  applicationsThisMonth: number
  averageApplicationsPerUser: number
  topPortals: { portal: string; count: number; percentage: number }[]
  userGrowth: { month: string; users: number; applications: number }[]
  dailyActivity: { date: string; users: number; applications: number }[]
  statusDistribution: { status: string; count: number; percentage: number }[]
  recentUsers: any[]
  recentApplications: any[]
  systemHealth: {
    uptime: number
    responseTime: number
    errorRate: number
    lastBackup: string
  }
}

const STATUS_COLORS = {
  applied: '#3B82F6',
  interviewing: '#F59E0B',
  rejected: '#EF4444',
  offer: '#10B981',
  withdrawn: '#6B7280',
}

const PORTAL_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d')
  const { supabase } = useSupabase()
  const { adminUser } = useAdminAuth()

  useEffect(() => {
    if (adminUser) {
      loadSystemStats()
    }
  }, [adminUser, timeRange])

  const loadSystemStats = async () => {
    try {
      setLoading(true)

      // Fetch all users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Fetch all applications
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select(`
          *,
          users (
            email,
            created_at
          )
        `)
        .order('created_at', { ascending: false })

      if (appsError) throw appsError

      const systemStats = calculateSystemStats(users || [], applications || [])
      setStats(systemStats)
    } catch (error) {
      console.error('Error loading system stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateSystemStats = (users: any[], applications: any[]): SystemStats => {
    const now = new Date()
    const thisMonth = startOfMonth(now)
    const lastMonth = startOfMonth(subMonths(now, 1))

    // Basic stats
    const totalUsers = users.length
    const totalApplications = applications.length
    const newUsersThisMonth = users.filter(user => new Date(user.created_at) >= thisMonth).length
    const applicationsThisMonth = applications.filter(app => new Date(app.created_at) >= thisMonth).length

    // Active users (users who have applications in the last 30 days)
    const thirtyDaysAgo = subDays(now, 30)
    const activeUserIds = new Set(
      applications
        .filter(app => new Date(app.created_at) >= thirtyDaysAgo)
        .map(app => app.user_id)
    )
    const activeUsers = activeUserIds.size

    // Average applications per user
    const averageApplicationsPerUser = totalUsers > 0 ? totalApplications / totalUsers : 0

    // Portal distribution
    const portalCount: { [key: string]: number } = {}
    applications.forEach(app => {
      portalCount[app.portal_used] = (portalCount[app.portal_used] || 0) + 1
    })

    const topPortals = Object.entries(portalCount)
      .map(([portal, count]) => ({
        portal,
        count,
        percentage: totalApplications > 0 ? (count / totalApplications) * 100 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)

    // Monthly growth data
    const userGrowth = eachMonthOfInterval({
      start: subMonths(now, 11),
      end: now
    }).map(month => {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)
      
      const usersCount = users.filter(user => {
        const date = new Date(user.created_at)
        return date >= monthStart && date <= monthEnd
      }).length

      const appsCount = applications.filter(app => {
        const date = new Date(app.created_at)
        return date >= monthStart && date <= monthEnd
      }).length

      return {
        month: format(month, 'MMM yyyy'),
        users: usersCount,
        applications: appsCount
      }
    })

    // Daily activity for the selected time range
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90
    const dailyActivity = eachDayOfInterval({
      start: subDays(now, days - 1),
      end: now
    }).map(day => {
      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000)

      const usersCount = users.filter(user => {
        const date = new Date(user.created_at)
        return date >= dayStart && date < dayEnd
      }).length

      const appsCount = applications.filter(app => {
        const date = new Date(app.created_at)
        return date >= dayStart && date < dayEnd
      }).length

      return {
        date: format(day, 'MMM dd'),
        users: usersCount,
        applications: appsCount
      }
    })

    // Status distribution
    const statusCount: { [key: string]: number } = {}
    applications.forEach(app => {
      statusCount[app.status] = (statusCount[app.status] || 0) + 1
    })

    const statusDistribution = Object.entries(statusCount).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
      percentage: totalApplications > 0 ? (count / totalApplications) * 100 : 0
    }))

    // Recent users and applications
    const recentUsers = users.slice(0, 10)
    const recentApplications = applications.slice(0, 15)

    // Mock system health data
    const systemHealth = {
      uptime: 99.9,
      responseTime: 145,
      errorRate: 0.02,
      lastBackup: format(subDays(now, 1), 'yyyy-MM-dd HH:mm:ss')
    }

    return {
      totalUsers,
      totalApplications,
      activeUsers,
      newUsersThisMonth,
      applicationsThisMonth,
      averageApplicationsPerUser,
      topPortals,
      userGrowth,
      dailyActivity,
      statusDistribution,
      recentUsers,
      recentApplications,
      systemHealth
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No data available
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Unable to load system statistics.
          </p>
        </div>
      </div>
    )
  }

  const keyMetrics = [
    {
      name: 'Total Users',
      value: stats.totalUsers.toLocaleString(),
      change: `+${stats.newUsersThisMonth}`,
      changeType: 'positive',
      icon: UsersIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    {
      name: 'Total Applications',
      value: stats.totalApplications.toLocaleString(),
      change: `+${stats.applicationsThisMonth}`,
      changeType: 'positive',
      icon: DocumentTextIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      name: 'Active Users',
      value: stats.activeUsers.toLocaleString(),
      change: `${((stats.activeUsers / stats.totalUsers) * 100).toFixed(1)}%`,
      changeType: 'neutral',
      icon: ChartBarIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
    },
    {
      name: 'Avg Apps/User',
      value: stats.averageApplicationsPerUser.toFixed(1),
      change: 'this month',
      changeType: 'neutral',
      icon: ClockIcon,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900',
    },
  ]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              System Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Welcome back, {adminUser?.email}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="form-input text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {keyMetrics.map((metric, index) => (
          <motion.div
            key={metric.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {metric.name}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metric.value}
                </p>
                <div className="flex items-center mt-1">
                  <span className={`text-sm ${
                    metric.changeType === 'positive' ? 'text-green-600' : 
                    metric.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {metric.change}
                  </span>
                </div>
              </div>
              <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="lg:col-span-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            System Health
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.systemHealth.uptime}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.systemHealth.responseTime}ms
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Response Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {stats.systemHealth.errorRate}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Error Rate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                <CheckCircleIcon className="h-8 w-8 mx-auto" />
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Last Backup: {format(new Date(stats.systemHealth.lastBackup), 'MMM dd')}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* User & Application Growth */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Growth Trends
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.userGrowth}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg)',
                    border: '1px solid var(--tooltip-border)',
                    borderRadius: '8px',
                    color: 'var(--tooltip-color)'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="New Users"
                />
                <Line
                  type="monotone"
                  dataKey="applications"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="New Applications"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Daily Activity */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Daily Activity ({timeRange})
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.dailyActivity}>
                <defs>
                  <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg)',
                    border: '1px solid var(--tooltip-border)',
                    borderRadius: '8px',
                    color: 'var(--tooltip-color)'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="applications"
                  stroke="#10B981"
                  fillOpacity={1}
                  fill="url(#colorApplications)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Status Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Application Status Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.statusDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="count"
                  label={({ status, percentage }) => `${status} ${percentage.toFixed(1)}%`}
                >
                  {stats.statusDistribution.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={STATUS_COLORS[entry.status.toLowerCase() as keyof typeof STATUS_COLORS] || '#6B7280'} 
                    />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Top Job Portals */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Job Portals
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topPortals}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="portal" 
                  tick={{ fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  className="text-gray-600 dark:text-gray-400"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg)',
                    border: '1px solid var(--tooltip-border)',
                    borderRadius: '8px',
                    color: 'var(--tooltip-color)'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="#F59E0B"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Users
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.recentUsers.slice(0, 5).map((user, index) => (
                <div key={user.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <UsersIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user.email}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        Joined {format(new Date(user.created_at), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Recent Applications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 1.0 }}
          className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
        >
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Applications
            </h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {stats.recentApplications.slice(0, 5).map((application, index) => (
                <div key={application.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <DocumentTextIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {application.job_title}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {application.company} • {format(new Date(application.created_at), 'MMM dd')}
                      </p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    application.status === 'applied' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                    application.status === 'interviewing' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                    application.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                    application.status === 'offer' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                    'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                  }`}>
                    {application.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}