'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EllipsisVerticalIcon,
  PencilIcon,
  TrashIcon,
  EyeIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline'
import { useSupabase } from '@/lib/supabase-provider'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

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
  url?: string
  notes?: string
  application_type?: string
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'applied', label: 'Applied' },
  { value: 'interviewing', label: 'Interviewing' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'offer', label: 'Offer' },
  { value: 'withdrawn', label: 'Withdrawn' },
]

const PORTAL_OPTIONS = [
  { value: 'all', label: 'All Portals' },
  { value: 'LinkedIn', label: 'LinkedIn' },
  { value: 'Indeed', label: 'Indeed' },
  { value: 'Glassdoor', label: 'Glassdoor' },
  { value: 'Dice', label: 'Dice' },
  { value: 'ZipRecruiter', label: 'ZipRecruiter' },
  { value: 'Monster', label: 'Monster' },
  { value: 'Company Website', label: 'Company Website' },
  { value: 'Other', label: 'Other' },
]

const SORT_OPTIONS = [
  { value: 'date_applied', label: 'Date Applied' },
  { value: 'created_at', label: 'Date Added' },
  { value: 'company', label: 'Company' },
  { value: 'job_title', label: 'Job Title' },
  { value: 'status', label: 'Status' },
]

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [portalFilter, setPortalFilter] = useState('all')
  const [sortBy, setSortBy] = useState('date_applied')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedApplications, setSelectedApplications] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const { user, supabase } = useSupabase()

  useEffect(() => {
    if (user) {
      loadApplications()
    }
  }, [user])

  useEffect(() => {
    filterAndSortApplications()
  }, [applications, searchTerm, statusFilter, portalFilter, sortBy, sortOrder])

  const loadApplications = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setApplications(data || [])
    } catch (error) {
      console.error('Error loading applications:', error)
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const filterAndSortApplications = () => {
    let filtered = [...applications]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(app =>
        app.job_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.location?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(app => app.status === statusFilter)
    }

    // Apply portal filter
    if (portalFilter !== 'all') {
      filtered = filtered.filter(app => app.portal_used === portalFilter)
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortBy as keyof Application]
      let bValue = b[sortBy as keyof Application]

      if (sortBy === 'date_applied' || sortBy === 'created_at') {
        aValue = new Date(aValue as string).getTime()
        bValue = new Date(bValue as string).getTime()
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase()
      }
      if (typeof bValue === 'string') {
        bValue = bValue.toLowerCase()
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    setFilteredApplications(filtered)
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const toggleApplicationSelection = (id: string) => {
    setSelectedApplications(prev =>
      prev.includes(id)
        ? prev.filter(appId => appId !== id)
        : [...prev, id]
    )
  }

  const selectAllApplications = () => {
    if (selectedApplications.length === filteredApplications.length) {
      setSelectedApplications([])
    } else {
      setSelectedApplications(filteredApplications.map(app => app.id))
    }
  }

  const deleteApplication = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error

      setApplications(prev => prev.filter(app => app.id !== id))
      setSelectedApplications(prev => prev.filter(appId => appId !== id))
      toast.success('Application deleted successfully')
    } catch (error) {
      console.error('Error deleting application:', error)
      toast.error('Failed to delete application')
    }
  }

  const bulkDelete = async () => {
    if (selectedApplications.length === 0) return

    if (!confirm(`Are you sure you want to delete ${selectedApplications.length} applications?`)) {
      return
    }

    try {
      const { error } = await supabase
        .from('applications')
        .delete()
        .in('id', selectedApplications)
        .eq('user_id', user.id)

      if (error) throw error

      setApplications(prev => prev.filter(app => !selectedApplications.includes(app.id)))
      setSelectedApplications([])
      toast.success(`${selectedApplications.length} applications deleted successfully`)
    } catch (error) {
      console.error('Error deleting applications:', error)
      toast.error('Failed to delete applications')
    }
  }

  const updateApplicationStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('applications')
        .update({ status: newStatus })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) throw error

      setApplications(prev =>
        prev.map(app =>
          app.id === id ? { ...app, status: newStatus } : app
        )
      )
      toast.success('Status updated successfully')
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Applications
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage and track all your job applications
            </p>
          </div>
          <Link
            href="/dashboard/applications/new"
            className="btn btn-primary btn-md inline-flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Add Application
          </Link>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card mb-6">
        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search applications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="form-input pl-10"
                />
              </div>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="btn btn-secondary btn-md inline-flex items-center"
            >
              <FunnelIcon className="h-4 w-4 mr-2" />
              Filters
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="form-label">Status</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="form-input"
                  >
                    {STATUS_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Portal</label>
                  <select
                    value={portalFilter}
                    onChange={(e) => setPortalFilter(e.target.value)}
                    className="form-input"
                  >
                    {PORTAL_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="form-label">Sort by</label>
                  <select
                    value={`${sortBy}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split('-')
                      setSortBy(field)
                      setSortOrder(order as 'asc' | 'desc')
                    }}
                    className="form-input"
                  >
                    {SORT_OPTIONS.map(option => (
                      <optgroup key={option.value} label={option.label}>
                        <option value={`${option.value}-desc`}>
                          {option.label} (Newest first)
                        </option>
                        <option value={`${option.value}-asc`}>
                          {option.label} (Oldest first)
                        </option>
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedApplications.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg p-4 mb-6"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm text-primary-700 dark:text-primary-300">
              {selectedApplications.length} applications selected
            </span>
            <div className="flex items-center space-x-3">
              <button
                onClick={bulkDelete}
                className="btn btn-secondary btn-sm text-red-600 hover:text-red-700"
              >
                Delete Selected
              </button>
              <button
                onClick={() => setSelectedApplications([])}
                className="btn btn-ghost btn-sm"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Applications List */}
      <div className="card">
        {filteredApplications.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No applications found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {applications.length === 0
                ? 'Get started by adding your first job application.'
                : 'Try adjusting your search or filter criteria.'}
            </p>
            {applications.length === 0 && (
              <div className="mt-6">
                <Link
                  href="/dashboard/applications/new"
                  className="btn btn-primary btn-md inline-flex items-center"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Application
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-hidden">
            {/* Table Header */}
            <div className="bg-gray-50 dark:bg-gray-800 px-6 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={selectedApplications.length === filteredApplications.length}
                  onChange={selectAllApplications}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Select All
                </span>
              </div>
            </div>

            {/* Applications */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredApplications.map((application, index) => (
                <motion.div
                  key={application.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="px-6 py-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedApplications.includes(application.id)}
                        onChange={() => toggleApplicationSelection(application.id)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {application.job_title}
                            </p>
                            <div className="flex items-center mt-1 space-x-4 text-sm text-gray-500 dark:text-gray-400">
                              <div className="flex items-center">
                                <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                                {application.company}
                              </div>
                              <div className="flex items-center">
                                <GlobeAltIcon className="h-4 w-4 mr-1" />
                                {application.portal_used}
                              </div>
                              {application.location && (
                                <div className="flex items-center">
                                  <span>📍 {application.location}</span>
                                </div>
                              )}
                              {application.salary_info && (
                                <div className="flex items-center">
                                  <BanknotesIcon className="h-4 w-4 mr-1" />
                                  {application.salary_info}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {format(new Date(application.date_applied), 'MMM dd, yyyy')}
                        </div>
                        <div className="mt-1">
                          <select
                            value={application.status}
                            onChange={(e) => updateApplicationStatus(application.id, e.target.value)}
                            className={`status-badge status-${application.status} text-xs border-none bg-transparent cursor-pointer`}
                          >
                            <option value="applied">Applied</option>
                            <option value="interviewing">Interviewing</option>
                            <option value="rejected">Rejected</option>
                            <option value="offer">Offer</option>
                            <option value="withdrawn">Withdrawn</option>
                          </select>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/dashboard/applications/${application.id}`}
                          className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/dashboard/applications/${application.id}/edit`}
                          className="p-2 text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => deleteApplication(application.id)}
                          className="p-2 text-gray-400 hover:text-red-500"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Summary */}
      {filteredApplications.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Showing {filteredApplications.length} of {applications.length} applications
        </div>
      )}
    </div>
  )
}