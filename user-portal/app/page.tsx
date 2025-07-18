'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { 
  ChartBarIcon, 
  ClockIcon, 
  DocumentCheckIcon, 
  GlobeAltIcon,
  SparklesIcon,
  ArrowRightIcon,
  CheckIcon,
  StarIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline'
import { useSupabase } from '@/lib/supabase-provider'

export default function LandingPage() {
  const { user } = useSupabase()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-blue-950 dark:to-indigo-900">
      {/* Navigation */}
      <nav className="relative z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold gradient-text">Job Tracker</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <Link
                  href="/dashboard"
                  className="btn btn-primary btn-md"
                >
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/auth/login"
                    className="btn btn-ghost btn-md"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/auth/signup"
                    className="btn btn-primary btn-md"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-24 sm:pt-24 sm:pb-32">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50 to-blue-100 dark:from-gray-900 dark:to-blue-950 opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-gray-900 dark:text-white">
                Track Your{' '}
                <span className="gradient-text">Job Applications</span>{' '}
                Automatically
              </h1>
              <p className="mt-6 text-xl sm:text-2xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto text-balance">
                Never lose track of your job search again. Our Chrome extension automatically tracks applications across LinkedIn, Indeed, Glassdoor, and more.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mt-10 flex flex-col sm:flex-row justify-center gap-4"
            >
              <Link
                href="/auth/signup"
                className="btn btn-primary btn-lg inline-flex items-center"
              >
                Get Started Free
                <ArrowRightIcon className="ml-2 w-5 h-5" />
              </Link>
              <Link
                href="#features"
                className="btn btn-secondary btn-lg"
              >
                Learn More
              </Link>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="mt-8 flex items-center justify-center space-x-6 text-sm text-gray-500 dark:text-gray-400"
            >
              <div className="flex items-center">
                <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
                Free to use
              </div>
              <div className="flex items-center">
                <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
                No credit card required
              </div>
              <div className="flex items-center">
                <CheckIcon className="w-4 h-4 text-green-500 mr-2" />
                Works on all major job sites
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              Everything you need to manage your job search
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
              Powerful features designed to make job hunting easier and more organized
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card card-hover p-8"
              >
                <div className="flex items-center justify-center w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-xl mb-6">
                  <feature.icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {feature.name}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              How It Works
            </h2>
            <p className="mt-4 text-xl text-gray-600 dark:text-gray-300">
              Get started in minutes with our simple 3-step process
            </p>
          </div>

          <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.2 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="flex items-center justify-center w-16 h-16 bg-primary-600 text-white rounded-full text-2xl font-bold mx-auto mb-6">
                  {index + 1}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                  {step.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {step.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Trusted by Job Seekers Worldwide
            </h2>
            <p className="text-xl text-primary-100 mb-16">
              Join thousands of professionals who have streamlined their job search
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center"
              >
                <div className="text-4xl sm:text-5xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-primary-100">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-white dark:bg-gray-900">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Ready to take control of your job search?
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8">
              Start tracking your applications automatically today. It's free and takes less than 2 minutes to set up.
            </p>
            <Link
              href="/auth/signup"
              className="btn btn-primary btn-lg inline-flex items-center"
            >
              Get Started Now
              <ArrowRightIcon className="ml-2 w-5 h-5" />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1">
              <h3 className="text-2xl font-bold gradient-text mb-4">Job Tracker</h3>
              <p className="text-gray-400">
                Automatically track and manage your job applications across all major job sites.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features" className="hover:text-white transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
                <li><Link href="/chrome-extension" className="hover:text-white transition-colors">Chrome Extension</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help" className="hover:text-white transition-colors">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors">Contact Us</Link></li>
                <li><Link href="/status" className="hover:text-white transition-colors">Status</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link href="/cookies" className="hover:text-white transition-colors">Cookie Policy</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Job Tracker. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

const features = [
  {
    name: 'Automatic Tracking',
    description: 'Our Chrome extension automatically detects and logs your job applications across LinkedIn, Indeed, Glassdoor, and more.',
    icon: ClockIcon,
  },
  {
    name: 'Real-time Analytics',
    description: 'Get insights into your job search with detailed analytics and progress tracking.',
    icon: ChartBarIcon,
  },
  {
    name: 'Application Management',
    description: 'View, edit, and organize all your applications in one centralized dashboard.',
    icon: DocumentCheckIcon,
  },
  {
    name: 'Multi-Platform Support',
    description: 'Works seamlessly across all major job sites and platforms.',
    icon: GlobeAltIcon,
  },
  {
    name: 'Smart Insights',
    description: 'AI-powered recommendations to improve your job search strategy.',
    icon: LightBulbIcon,
  },
  {
    name: 'Secure & Private',
    description: 'Your data is encrypted and stored securely. We never share your information.',
    icon: ShieldCheckIcon,
  },
]

const steps = [
  {
    title: 'Install Extension',
    description: 'Download our Chrome extension and create your free account in under 2 minutes.',
  },
  {
    title: 'Apply to Jobs',
    description: 'Continue applying to jobs as usual. Our extension automatically tracks everything.',
  },
  {
    title: 'Track & Analyze',
    description: 'View your applications, track progress, and get insights in your personal dashboard.',
  },
]

const stats = [
  {
    value: '50K+',
    label: 'Applications Tracked',
  },
  {
    value: '10K+',
    label: 'Active Users',
  },
  {
    value: '25+',
    label: 'Job Sites Supported',
  },
  {
    value: '99.9%',
    label: 'Uptime',
  },
]