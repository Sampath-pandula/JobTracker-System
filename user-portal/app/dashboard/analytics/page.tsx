'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ChartBarIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  CalendarDaysIcon,
  BriefcaseIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline'
import { useSupabase } from '@/lib/supabase-provider'
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

interface Application {
  id: string
  job_title: string
  company: string
  portal_used: string
  status: string
  date_applied: string
  created_at: string
  location?: string
  salary_info?: string
}

interface AnalyticsData {
  totalApplications: number
  thisMonth: number
  lastMonth: number
  monthlyGrowth: number
  averagePerWeek: number
  successRate: number
  responseRate: number
  timeToResponse: number
  statusDistribution: { name: string; value: number; color: string }[]
  portalDistribution: { name: string; value: number; color: string }[]
  monthlyTrend: { month: string; applications: number }[]
  weeklyTrend: { week: string; applications: number }[]
  dailyTrend: { date: string; applications: number }[]
  topCompanies: { company: string; count: number }[]
  topPortals: { portal: string; count: number; successRate: number }[]
  statusTimeline: { status: string; count: number; percentage: number }[]
}

const STATUS_COLORS = {
  applied: '#3B82F6',
  interviewing: '#F59E0B',
  rejected: '#EF4444',
  offer: '#10B981',
  withdrawn: '#6B7280',
}

const PORTAL_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const { user, supabase } = useSupabase()

  useEffect(() => {
    if (user) {
      loadAnalytics()
    }
  }, [user, timeRange])

  const loadAnalytics = async () => {
    try {
      setLoading(true)

      // Fetch all applications
      const { data: applications, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('date_applied', { ascending: true })

      if (error) throw error

      const analyticsData = calculateAnalytics(applications || [])
      setAnalytics(analyticsData)
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const calculateAnalytics = (applications: Application[]): AnalyticsData => {
    const now = new Date()
    const thisMonth = startOfMonth(now)
    const lastMonth = startOfMonth(subMonths(now, 1))
    const lastMonthEnd = endOfMonth(subMonths(now, 1))

    // Basic stats
    const totalApplications = applications.length
    const thisMonthApps = applications.filter(app => new Date(app.date_applied) >= thisMonth).length
    const lastMonthApps = applications.filter(app => {
      const date = new Date(app.date_applied)
      return date >= lastMonth && date <= lastMonthEnd
    }).length

    const monthlyGrowth = lastMonthApps > 0 ? ((thisMonthApps - lastMonthApps) / lastMonthApps) * 100 : 0

    // Success and response rates
    const successfulApps = applications.filter(app => app.status === 'offer').length
    const responseApps = applications.filter(app => ['interviewing', 'rejected', 'offer'].includes(app.status)).length
    const successRate = totalApplications > 0 ? (successfulApps / totalApplications) * 100 : 0
    const responseRate = totalApplications > 0 ? (responseApps / totalApplications) * 100 : 0

    // Average per week
    const oldestApp = applications.length > 0 ? new Date(applications[0].date_applied) : now
    const weeksSinceStart = Math.max(1, Math.ceil((now.getTime() - oldestApp.getTime()) / (7 * 24 * 60 * 60 * 1000)))
    const averagePerWeek = totalApplications / weeksSinceStart

    // Status distribution
    const statusCount: { [key: string]: number } = {}
    applications.forEach(app => {
      statusCount[app.status] = (statusCount[app.status] || 0) + 1
    })

    const statusDistribution = Object.entries(statusCount).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: STATUS_COLORS[status as keyof typeof STATUS_COLORS] || '#6B7280'
    }))

    // Portal distribution
    const portalCount: { [key: string]: number } = {}
    applications.forEach(app => {
      portalCount[app.portal_used] = (portalCount[app.portal_used] || 0) + 1
    })

    const portalDistribution = Object.entries(portalCount)
      .map(([portal, count], index) => ({
        name: portal,
        value: count,
        color: PORTAL_COLORS[index % PORTAL_COLORS.length]
      }))
      .sort((a, b) => b.value - a.value)

    // Monthly trend
    const monthlyTrend = eachMonthOfInterval({
      start: subMonths(now, 11),
      end: now
    }).map(month => {
      const monthStart = startOfMonth(month)
      const monthEnd = endOfMonth(month)
      const count = applications.filter(app => {
        const date = new Date(app.date_applied)
        return date >= monthStart && date <= monthEnd
      }).length

      return {
        month: format(month, 'MMM yyyy'),
        applications: count
      }
    })

    // Daily trend for last 30 days
    const dailyTrend = eachDayOfInterval({
      start: subDays(now, 29),
      end: now
    }).map(day => {
      const count = applications.filter(app => {
        const appDate = new Date(app.date_applied)
        return appDate.toDateString() === day.toDateString()
      }).length

      return {
        date: format(day, 'MMM dd'),
        applications: count
      }
    })

    // Top companies
    const companyCount: { [key: string]: number } = {}
    applications.forEach(app => {
      companyCount[app.company] = (companyCount[app.company] || 0) + 1
    })

    const topCompanies = Object.entries(companyCount)
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Top portals with success rates
    const topPortals = Object.entries(portalCount)
      .map(([portal, count]) => {
        const portalOffers = applications.filter(app => app.portal_used === portal && app.status === 'offer').length
        const successRate = count > 0 ? (portalOffers / count) * 100 : 0
        return { portal, count, successRate }
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    // Status timeline
    const statusTimeline = Object.entries(statusCount).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1),
      count,
      percentage: totalApplications > 0 ? (count / totalApplications) * 100 : 0
    }))

    return {
      totalApplications,
      thisMonth: thisMonthApps,
      lastMonth: lastMonthApps,
      monthlyGrowth,
      averagePerWeek,
      successRate,
      responseRate,
      timeToResponse: 0, // This would require more complex calculation
      statusDistribution,
      portalDistribution,
      monthlyTrend,
      weeklyTrend: [], // Simplified for now
      dailyTrend,
      topCompanies,
      topPortals,
      statusTimeline
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
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

  if (!analytics) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            No analytics available
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Add some job applications to see your analytics.
          </p>
        </div>
      </div>
    )
  }

  const keyMetrics = [
    {
      name: 'Total Applications',
      value: analytics.totalApplications,
      change: analytics.monthlyGrowth,
      changeType: analytics.monthlyGrowth >= 0 ? 'positive' : 'negative',
      icon: BriefcaseIcon,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900',
    },
    {
      name: 'Success Rate',
      value: `${analytics.successRate.toFixed(1)}%`,
      change: 0, // Would need historical data
      changeType: 'neutral',
      icon: CheckCircleIcon,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900',
    },
    {
      name: 'Response Rate',
      value: `${analytics.responseRate.toFixed(1)}%`,
      change: 0, // Would need historical data
      changeType: 'neutral',
      icon: ClockIcon,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
    },
    {
      name: 'Avg per Week',
      value: analytics.averagePerWeek.toFixed(1),
      change: 0, // Would need historical data
      changeType: 'neutral',
      icon: CalendarDaysIcon,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900',
    },
  ]

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Analytics
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Track your job search progress and performance
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
              <option value="1y">Last year</option>
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
            className="card p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {metric.name}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {metric.value}
                </p>
                {metric.change !== 0 && (
                  <div className="flex items-center mt-1">
                    {metric.changeType === 'positive' ? (
                      <TrendingUpIcon className="h-4 w-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingDownIcon className="h-4 w-4 text-red-500 mr-1" />
                    )}
                    <span className={`text-sm ${
                      metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.change > 0 ? '+' : ''}{metric.change.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>
              <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`h-6 w-6 ${metric.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Monthly Trend */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Monthly Application Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics.monthlyTrend}>
                <defs>
                  <linearGradient id="colorApplications" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="applications"
                  stroke="#3B82F6"
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
          transition={{ duration: 0.5, delay: 0.5 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Application Status Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.statusDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {analytics.statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Daily Applications */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Daily Applications (Last 30 Days)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.dailyTrend}>
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
                <Line
                  type="monotone"
                  dataKey="applications"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={{ fill: '#10B981', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 5, stroke: '#10B981', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Portal Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Applications by Job Portal
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.portalDistribution}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis 
                  dataKey="name" 
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
                  dataKey="value" 
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Top Companies and Portals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Companies */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Companies Applied To
          </h3>
          <div className="space-y-3">
            {analytics.topCompanies.slice(0, 5).map((company, index) => (
              <div key={company.company} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {index + 1}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {company.company}
                  </span>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {company.count} applications
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Portal Performance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.9 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Portal Performance
          </h3>
          <div className="space-y-3">
            {analytics.topPortals.slice(0, 5).map((portal, index) => (
              <div key={portal.portal} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {portal.portal}
                    </span>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {portal.count} applications
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                    {portal.successRate.toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    success rate
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}