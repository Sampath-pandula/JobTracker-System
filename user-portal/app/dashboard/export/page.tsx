'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowDownTrayIcon,
  DocumentArrowDownIcon,
  TableCellsIcon,
  DocumentTextIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline'
import { useSupabase } from '@/lib/supabase-provider'
import { format, subDays, subMonths, subWeeks } from 'date-fns'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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

interface ExportOptions {
  format: 'csv' | 'pdf' | 'json'
  dateRange: 'all' | '7d' | '30d' | '90d' | 'custom'
  statuses: string[]
  portals: string[]
  includeFields: string[]
  customStartDate?: string
  customEndDate?: string
}

const AVAILABLE_FIELDS = [
  { key: 'job_title', label: 'Job Title' },
  { key: 'company', label: 'Company' },
  { key: 'location', label: 'Location' },
  { key: 'portal_used', label: 'Job Portal' },
  { key: 'status', label: 'Status' },
  { key: 'date_applied', label: 'Date Applied' },
  { key: 'application_type', label: 'Application Type' },
  { key: 'salary_info', label: 'Salary Info' },
  { key: 'url', label: 'Job URL' },
  { key: 'notes', label: 'Notes' },
  { key: 'created_at', label: 'Date Added' },
]

const STATUS_OPTIONS = ['applied', 'interviewing', 'rejected', 'offer', 'withdrawn']

export default function ExportPage() {
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [exportCount, setExportCount] = useState(0)
  const [portals, setPortals] = useState<string[]>([])
  
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: 'csv',
    dateRange: 'all',
    statuses: [...STATUS_OPTIONS],
    portals: [],
    includeFields: AVAILABLE_FIELDS.map(field => field.key),
    customStartDate: '',
    customEndDate: '',
  })

  const { user, supabase } = useSupabase()

  useEffect(() => {
    if (user) {
      loadApplications()
    }
  }, [user])

  useEffect(() => {
    updateExportCount()
  }, [applications, exportOptions])

  const loadApplications = async () => {
    try {
      setLoading(true)

      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('user_id', user.id)
        .order('date_applied', { ascending: false })

      if (error) throw error

      setApplications(data || [])
      
      // Extract unique portals
      const uniquePortals = [...new Set(data?.map(app => app.portal_used) || [])]
      setPortals(uniquePortals)
      setExportOptions(prev => ({ ...prev, portals: uniquePortals }))
    } catch (error) {
      console.error('Error loading applications:', error)
      toast.error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const updateExportCount = () => {
    const filtered = getFilteredApplications()
    setExportCount(filtered.length)
  }

  const getFilteredApplications = (): Application[] => {
    let filtered = [...applications]

    // Filter by date range
    if (exportOptions.dateRange !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (exportOptions.dateRange) {
        case '7d':
          startDate = subDays(now, 7)
          break
        case '30d':
          startDate = subDays(now, 30)
          break
        case '90d':
          startDate = subDays(now, 90)
          break
        case 'custom':
          if (exportOptions.customStartDate && exportOptions.customEndDate) {
            const customStart = new Date(exportOptions.customStartDate)
            const customEnd = new Date(exportOptions.customEndDate)
            filtered = filtered.filter(app => {
              const appDate = new Date(app.date_applied)
              return appDate >= customStart && appDate <= customEnd
            })
          }
          return filtered
        default:
          return filtered
      }

      filtered = filtered.filter(app => new Date(app.date_applied) >= startDate)
    }

    // Filter by status
    filtered = filtered.filter(app => exportOptions.statuses.includes(app.status))

    // Filter by portals
    filtered = filtered.filter(app => exportOptions.portals.includes(app.portal_used))

    return filtered
  }

  const exportToCSV = (data: Application[]) => {
    const headers = exportOptions.includeFields.map(field => 
      AVAILABLE_FIELDS.find(f => f.key === field)?.label || field
    )

    const rows = data.map(app => 
      exportOptions.includeFields.map(field => {
        const value = app[field as keyof Application] || ''
        // Escape commas and quotes in CSV
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value
      })
    )

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `job-applications-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const exportToPDF = (data: Application[]) => {
    const doc = new jsPDF()
    
    // Add title
    doc.setFontSize(20)
    doc.text('Job Applications Report', 20, 20)
    
    // Add metadata
    doc.setFontSize(12)
    doc.text(`Generated on: ${format(new Date(), 'MMMM dd, yyyy')}`, 20, 35)
    doc.text(`Total Applications: ${data.length}`, 20, 45)
    
    // Prepare table data
    const headers = exportOptions.includeFields.map(field => 
      AVAILABLE_FIELDS.find(f => f.key === field)?.label || field
    )

    const rows = data.map(app => 
      exportOptions.includeFields.map(field => {
        const value = app[field as keyof Application]
        if (field === 'date_applied' && value) {
          return format(new Date(value as string), 'MMM dd, yyyy')
        }
        if (field === 'created_at' && value) {
          return format(new Date(value as string), 'MMM dd, yyyy')
        }
        return value || ''
      })
    )

    // Add table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 60,
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontSize: 9,
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 'auto' }, // Job Title
        1: { cellWidth: 'auto' }, // Company
        2: { cellWidth: 'auto' }, // Location
      },
      margin: { left: 10, right: 10 },
    })

    doc.save(`job-applications-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
  }

  const exportToJSON = (data: Application[]) => {
    const filteredData = data.map(app => {
      const filtered: any = {}
      exportOptions.includeFields.forEach(field => {
        filtered[field] = app[field as keyof Application]
      })
      return filtered
    })

    const jsonContent = JSON.stringify({
      exportDate: new Date().toISOString(),
      totalApplications: data.length,
      applications: filteredData
    }, null, 2)

    const blob = new Blob([jsonContent], { type: 'application/json' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `job-applications-${format(new Date(), 'yyyy-MM-dd')}.json`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const handleExport = async () => {
    if (exportCount === 0) {
      toast.error('No applications to export with current filters')
      return
    }

    setExporting(true)
    
    try {
      const filteredData = getFilteredApplications()
      
      switch (exportOptions.format) {
        case 'csv':
          exportToCSV(filteredData)
          break
        case 'pdf':
          exportToPDF(filteredData)
          break
        case 'json':
          exportToJSON(filteredData)
          break
      }

      toast.success(`Successfully exported ${filteredData.length} applications as ${exportOptions.format.toUpperCase()}`)
    } catch (error) {
      console.error('Export error:', error)
      toast.error('Failed to export data')
    } finally {
      setExporting(false)
    }
  }

  const handleFieldToggle = (field: string) => {
    setExportOptions(prev => ({
      ...prev,
      includeFields: prev.includeFields.includes(field)
        ? prev.includeFields.filter(f => f !== field)
        : [...prev.includeFields, field]
    }))
  }

  const handleStatusToggle = (status: string) => {
    setExportOptions(prev => ({
      ...prev,
      statuses: prev.statuses.includes(status)
        ? prev.statuses.filter(s => s !== status)
        : [...prev.statuses, status]
    }))
  }

  const handlePortalToggle = (portal: string) => {
    setExportOptions(prev => ({
      ...prev,
      portals: prev.portals.includes(portal)
        ? prev.portals.filter(p => p !== portal)
        : [...prev.portals, portal]
    }))
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Export Data
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Export your job application data in various formats
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Format Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Export Format
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { value: 'csv', label: 'CSV', icon: TableCellsIcon, description: 'Spreadsheet compatible' },
                { value: 'pdf', label: 'PDF', icon: DocumentArrowDownIcon, description: 'Formatted report' },
                { value: 'json', label: 'JSON', icon: DocumentTextIcon, description: 'Structured data' },
              ].map((format) => (
                <label key={format.value} className="cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value={format.value}
                    checked={exportOptions.format === format.value}
                    onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as any }))}
                    className="sr-only"
                  />
                  <div className={`p-4 border-2 rounded-lg transition-all duration-200 ${
                    exportOptions.format === format.value
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <format.icon className={`h-6 w-6 ${
                        exportOptions.format === format.value ? 'text-primary-600' : 'text-gray-400'
                      }`} />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {format.label}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {format.description}
                        </div>
                      </div>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </motion.div>

          {/* Date Range */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Date Range
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { value: 'all', label: 'All Time' },
                  { value: '7d', label: 'Last 7 Days' },
                  { value: '30d', label: 'Last 30 Days' },
                  { value: '90d', label: 'Last 90 Days' },
                ].map((range) => (
                  <label key={range.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="dateRange"
                      value={range.value}
                      checked={exportOptions.dateRange === range.value}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, dateRange: e.target.value as any }))}
                      className="sr-only"
                    />
                    <div className={`p-3 text-sm text-center border rounded-lg transition-all duration-200 ${
                      exportOptions.dateRange === range.value
                        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}>
                      {range.label}
                    </div>
                  </label>
                ))}
              </div>
              
              <label className="cursor-pointer">
                <input
                  type="radio"
                  name="dateRange"
                  value="custom"
                  checked={exportOptions.dateRange === 'custom'}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, dateRange: 'custom' }))}
                  className="sr-only"
                />
                <div className={`p-3 border rounded-lg transition-all duration-200 ${
                  exportOptions.dateRange === 'custom'
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-sm font-medium ${
                      exportOptions.dateRange === 'custom' 
                        ? 'text-primary-700 dark:text-primary-300' 
                        : 'text-gray-700 dark:text-gray-300'
                    }`}>
                      Custom Range
                    </span>
                  </div>
                  {exportOptions.dateRange === 'custom' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          Start Date
                        </label>
                        <input
                          type="date"
                          value={exportOptions.customStartDate}
                          onChange={(e) => setExportOptions(prev => ({ ...prev, customStartDate: e.target.value }))}
                          className="form-input text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                          End Date
                        </label>
                        <input
                          type="date"
                          value={exportOptions.customEndDate}
                          onChange={(e) => setExportOptions(prev => ({ ...prev, customEndDate: e.target.value }))}
                          className="form-input text-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Filters
            </h3>
            
            <div className="space-y-6">
              {/* Status Filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Application Status
                </h4>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((status) => (
                    <label key={status} className="cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportOptions.statuses.includes(status)}
                        onChange={() => handleStatusToggle(status)}
                        className="sr-only"
                      />
                      <span className={`status-badge ${
                        exportOptions.statuses.includes(status) ? `status-${status}` : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Portal Filter */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Job Portals
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {portals.map((portal) => (
                    <label key={portal} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportOptions.portals.includes(portal)}
                        onChange={() => handlePortalToggle(portal)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {portal}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Fields Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Include Fields
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {AVAILABLE_FIELDS.map((field) => (
                <label key={field.key} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={exportOptions.includeFields.includes(field.key)}
                    onChange={() => handleFieldToggle(field.key)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {field.label}
                  </span>
                </label>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Export Summary & Actions */}
        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Export Summary
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Total Applications
                </span>
                <span className="text-lg font-semibold text-gray-900 dark:text-white">
                  {applications.length}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Applications to Export
                </span>
                <span className="text-lg font-semibold text-primary-600">
                  {exportCount}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Format
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {exportOptions.format.toUpperCase()}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Fields Included
                </span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {exportOptions.includeFields.length}
                </span>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleExport}
                disabled={exporting || exportCount === 0}
                className="btn btn-primary btn-lg w-full"
              >
                {exporting ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Exporting...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <ArrowDownTrayIcon className="h-5 w-5 mr-2" />
                    Export {exportCount} Applications
                  </div>
                )}
              </button>
            </div>

            {exportCount === 0 && (
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  No applications match your current filters. Please adjust your selection.
                </p>
              </div>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Quick Actions
            </h3>
            
            <div className="space-y-3">
              <button
                onClick={() => setExportOptions(prev => ({
                  ...prev,
                  dateRange: 'all',
                  statuses: [...STATUS_OPTIONS],
                  portals: [...portals],
                  includeFields: AVAILABLE_FIELDS.map(f => f.key),
                }))}
                className="btn btn-secondary btn-sm w-full"
              >
                Select All
              </button>
              
              <button
                onClick={() => setExportOptions(prev => ({
                  ...prev,
                  dateRange: '30d',
                  statuses: ['applied', 'interviewing'],
                  includeFields: ['job_title', 'company', 'portal_used', 'date_applied', 'status'],
                }))}
                className="btn btn-secondary btn-sm w-full"
              >
                Active Applications Only
              </button>
              
              <button
                onClick={() => setExportOptions(prev => ({
                  ...prev,
                  statuses: ['offer'],
                  includeFields: ['job_title', 'company', 'date_applied', 'salary_info'],
                }))}
                className="btn btn-secondary btn-sm w-full"
              >
                Offers Only
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}