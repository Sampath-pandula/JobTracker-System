// Supabase Configuration
const SUPABASE_URL = 'https://nluywlsamqwqcohqycwk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sdXl3bHNhbXF3cWNvaHF5Y3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1NDU0NDgsImV4cCI6MjA2ODEyMTQ0OH0.vPw8baaEUfNR_HdsDRj_utQHubMVjn5F4if2MA1h-2Y';
const USER_PORTAL_URL = 'https://job-tracker-user-portal-omega.vercel.app';

// Global State
let currentUser = null;
let isConnected = false;
let applications = [];

// DOM Elements
const elements = {
  themeToggle: null,
  connectionStatus: null,
  navTabs: null,
  tabPanes: null,
  addJobForm: null,
  openDashboard: null,
  signOut: null,
  exportData: null,
  statsElements: {
    total: null,
    month: null,
    week: null,
    today: null
  },
  recentAppsList: null,
  userEmail: null,
  supabaseUrl: null,
  supabaseKey: null,
  autoDetection: null,
  notifications: null
};

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  initializeElements();
  setupEventListeners();
  await loadUserData();
  await loadApplications();
  updateUI();
});

// Initialize DOM elements
function initializeElements() {
  elements.themeToggle = document.getElementById('themeToggle');
  elements.connectionStatus = document.getElementById('connectionStatus');
  elements.navTabs = document.querySelectorAll('.nav-tab');
  elements.tabPanes = document.querySelectorAll('.tab-pane');
  elements.addJobForm = document.getElementById('addJobForm');
  elements.openDashboard = document.getElementById('openDashboard');
  elements.signOut = document.getElementById('signOut');
  elements.exportData = document.getElementById('exportData');
  elements.recentAppsList = document.getElementById('recentAppsList');
  elements.userEmail = document.getElementById('userEmail');
  elements.supabaseUrl = document.getElementById('supabaseUrl');
  elements.supabaseKey = document.getElementById('supabaseKey');
  elements.autoDetection = document.getElementById('autoDetection');
  elements.notifications = document.getElementById('notifications');

  // Stats elements
  elements.statsElements.total = document.getElementById('totalApps');
  elements.statsElements.month = document.getElementById('monthApps');
  elements.statsElements.week = document.getElementById('weekApps');
  elements.statsElements.today = document.getElementById('todayApps');

  // Set configuration values
  if (elements.supabaseUrl) elements.supabaseUrl.value = SUPABASE_URL;
  if (elements.supabaseKey) elements.supabaseKey.value = SUPABASE_ANON_KEY;

  // Load theme preference
  loadTheme();
}

// Setup event listeners
function setupEventListeners() {
  // Theme toggle
  elements.themeToggle?.addEventListener('click', toggleTheme);

  // Navigation tabs
  elements.navTabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });

  // Add job form
  elements.addJobForm?.addEventListener('submit', handleAddJob);

  // Dashboard button
  elements.openDashboard?.addEventListener('click', openDashboard);

  // Sign out button
  elements.signOut?.addEventListener('click', handleSignOut);

  // Export data button
  elements.exportData?.addEventListener('click', handleExportData);

  // Settings checkboxes
  elements.autoDetection?.addEventListener('change', saveSettings);

  // Form field pre-fill from current page
  prefillFromCurrentPage();
}

// Load user data from storage
async function loadUserData() {
  try {
    const result = await chrome.storage.sync.get(['user', 'accessToken']);
    if (result.user && result.accessToken) {
      currentUser = result.user;
      isConnected = true;
      updateConnectionStatus('connected', 'Connected');
      
      if (elements.userEmail) {
        elements.userEmail.textContent = currentUser.email || 'Signed in';
      }
    } else {
      updateConnectionStatus('disconnected', 'Not signed in');
      if (elements.userEmail) {
        elements.userEmail.textContent = 'Not signed in';
      }
    }
  } catch (error) {
    console.error('Error loading user data:', error);
    updateConnectionStatus('error', 'Error');
  }
}

// Load applications from storage and Supabase
async function loadApplications() {
  if (!currentUser) {
    applications = [];
    return;
  }

  try {
    updateConnectionStatus('connecting', 'Loading...');
    
    // First, try to load from local storage for quick display
    const localData = await chrome.storage.local.get(['applications']);
    if (localData.applications) {
      applications = localData.applications;
      updateStats();
      updateRecentApplications();
    }

    // Then sync with Supabase
    await syncWithSupabase();
    
  } catch (error) {
    console.error('Error loading applications:', error);
    showNotification('Error loading applications', 'error');
  }
}

// Sync with Supabase
async function syncWithSupabase() {
  if (!currentUser) return;

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/applications?user_id=eq.${currentUser.id}&order=created_at.desc`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      applications = await response.json();
      
      // Save to local storage
      await chrome.storage.local.set({ applications });
      
      updateStats();
      updateRecentApplications();
      updateConnectionStatus('connected', 'Connected');
    } else {
      throw new Error('Failed to sync with database');
    }
  } catch (error) {
    console.error('Sync error:', error);
    updateConnectionStatus('error', 'Sync error');
  }
}

// Get access token
async function getAccessToken() {
  const result = await chrome.storage.sync.get(['accessToken']);
  return result.accessToken || SUPABASE_ANON_KEY;
}

// Update connection status
function updateConnectionStatus(status, text) {
  if (!elements.connectionStatus) return;

  const statusDot = elements.connectionStatus.querySelector('.status-dot');
  const statusText = elements.connectionStatus.querySelector('.status-text');

  if (statusDot) {
    statusDot.className = `status-dot ${status}`;
  }
  
  if (statusText) {
    statusText.textContent = text;
  }
}

// Update statistics
function updateStats() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const stats = {
    total: applications.length,
    today: applications.filter(app => new Date(app.date_applied) >= today).length,
    week: applications.filter(app => new Date(app.date_applied) >= weekStart).length,
    month: applications.filter(app => new Date(app.date_applied) >= monthStart).length
  };

  // Update UI
  if (elements.statsElements.total) elements.statsElements.total.textContent = stats.total;
  if (elements.statsElements.today) elements.statsElements.today.textContent = stats.today;
  if (elements.statsElements.week) elements.statsElements.week.textContent = stats.week;
  if (elements.statsElements.month) elements.statsElements.month.textContent = stats.month;
}

// Update recent applications
function updateRecentApplications() {
  if (!elements.recentAppsList) return;

  if (applications.length === 0) {
    elements.recentAppsList.innerHTML = `
      <div class="empty-state">
        No applications yet. Add your first job application!
      </div>
    `;
    return;
  }

  const recentApps = applications.slice(0, 5);
  elements.recentAppsList.innerHTML = recentApps.map(app => {
    const date = new Date(app.date_applied).toLocaleDateString();
    return `
      <div class="recent-item">
        <div class="recent-header">
          <div class="recent-title">${app.job_title}</div>
          <div class="recent-date">${date}</div>
        </div>
        <div class="recent-company">${app.company}</div>
        <div class="recent-portal">${app.portal_used}</div>
      </div>
    `;
  }).join('');
}

// Switch tabs
function switchTab(tabId) {
  // Update tab buttons
  elements.navTabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabId);
  });

  // Update tab panes
  elements.tabPanes.forEach(pane => {
    pane.classList.toggle('active', pane.id === tabId);
  });
}

// Handle add job form submission
async function handleAddJob(event) {
  event.preventDefault();
  
  if (!currentUser) {
    showNotification('Please sign in to add applications', 'error');
    return;
  }

  const submitButton = event.target.querySelector('button[type="submit"]');
  const btnText = submitButton.querySelector('.btn-text');
  const btnLoading = submitButton.querySelector('.btn-loading');

  try {
    // Show loading state
    submitButton.classList.add('loading');
    submitButton.disabled = true;

    const formData = new FormData(event.target);
    const applicationData = {
      user_id: currentUser.id,
      job_title: formData.get('jobTitle'),
      company: formData.get('company'),
      location: formData.get('location') || null,
      portal_used: formData.get('portalUsed'),
      url: formData.get('jobUrl') || null,
      salary_info: formData.get('salaryInfo') || null,
      application_type: formData.get('applicationType'),
      notes: formData.get('notes') || null,
      date_applied: new Date().toISOString().split('T')[0],
      status: 'applied'
    };

    // Send to Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/applications`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${await getAccessToken()}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(applicationData)
    });

    if (response.ok) {
      const newApplication = await response.json();
      
      // Add to local applications array
      applications.unshift(newApplication[0]);
      
      // Update local storage
      await chrome.storage.local.set({ applications });
      
      // Update UI
      updateStats();
      updateRecentApplications();
      
      // Reset form
      event.target.reset();
      
      // Switch to dashboard tab
      switchTab('dashboard');
      
      showNotification('Application added successfully!', 'success');
      
    } else {
      throw new Error('Failed to save application');
    }

  } catch (error) {
    console.error('Error adding application:', error);
    showNotification('Failed to add application', 'error');
  } finally {
    // Hide loading state
    submitButton.classList.remove('loading');
    submitButton.disabled = false;
  }
}

// Pre-fill form from current page
async function prefillFromCurrentPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.url) return;

    const url = new URL(tab.url);
    const hostname = url.hostname;

    // Detect job portal
    let portal = 'Other';
    if (hostname.includes('linkedin')) portal = 'LinkedIn';
    else if (hostname.includes('indeed')) portal = 'Indeed';
    else if (hostname.includes('glassdoor')) portal = 'Glassdoor';
    else if (hostname.includes('dice')) portal = 'Dice';
    else if (hostname.includes('ziprecruiter')) portal = 'ZipRecruiter';
    else if (hostname.includes('monster')) portal = 'Monster';

    // Set portal in form
    const portalSelect = document.getElementById('portalUsed');
    if (portalSelect && portal !== 'Other') {
      portalSelect.value = portal;
    }

    // Set URL
    const urlInput = document.getElementById('jobUrl');
    if (urlInput) {
      urlInput.value = tab.url;
    }

  } catch (error) {
    console.error('Error pre-filling from current page:', error);
  }
}

// Open dashboard
function openDashboard() {
  chrome.tabs.create({ url: USER_PORTAL_URL });
}

// Handle sign out
async function handleSignOut() {
  try {
    await chrome.storage.sync.clear();
    await chrome.storage.local.clear();
    
    currentUser = null;
    isConnected = false;
    applications = [];
    
    updateUI();
    updateConnectionStatus('disconnected', 'Signed out');
    showNotification('Signed out successfully', 'success');
    
  } catch (error) {
    console.error('Error signing out:', error);
    showNotification('Error signing out', 'error');
  }
}

// Handle export data
async function handleExportData() {
  if (!currentUser || applications.length === 0) {
    showNotification('No data to export', 'error');
    return;
  }

  try {
    // Create CSV content
    const headers = ['Date Applied', 'Job Title', 'Company', 'Location', 'Portal', 'Status', 'Application Type', 'URL', 'Salary Info', 'Notes'];
    const csvContent = [
      headers.join(','),
      ...applications.map(app => [
        app.date_applied,
        `"${app.job_title}"`,
        `"${app.company}"`,
        `"${app.location || ''}"`,
        `"${app.portal_used}"`,
        `"${app.status}"`,
        `"${app.application_type || ''}"`,
        `"${app.url || ''}"`,
        `"${app.salary_info || ''}"`,
        `"${app.notes || ''}"`
      ].join(','))
    ].join('\n');

    // Create download
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    chrome.downloads.download({
      url: url,
      filename: `job-applications-${new Date().toISOString().split('T')[0]}.csv`
    });

    showNotification('Data exported successfully!', 'success');

  } catch (error) {
    console.error('Error exporting data:', error);
    showNotification('Failed to export data', 'error');
  }
}

// Save settings
async function saveSettings() {
  const settings = {
    autoDetection: elements.autoDetection?.checked || false,
    notifications: document.getElementById('notifications')?.checked || true
  };

  await chrome.storage.sync.set({ settings });
}

// Theme functions
function loadTheme() {
  chrome.storage.sync.get(['theme'], (result) => {
    const theme = result.theme || 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
  });
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  chrome.storage.sync.set({ theme: newTheme });
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const icon = elements.themeToggle?.querySelector('.theme-icon');
  if (icon) {
    icon.textContent = theme === 'light' ? '🌙' : '☀️';
  }
}

// Show notification
function showNotification(message, type = 'success') {
  if (!elements.notifications) return;

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  
  const icon = type === 'success' ? '✓' : '⚠️';
  
  notification.innerHTML = `
    <div class="notification-icon">${icon}</div>
    <div class="notification-content">
      <div class="notification-message">${message}</div>
    </div>
  `;

  elements.notifications.appendChild(notification);

  // Auto remove after 3 seconds
  setTimeout(() => {
    notification.remove();
  }, 3000);
}

// Update UI based on current state
function updateUI() {
  updateStats();
  updateRecentApplications();
  
  // Update sign out button visibility
  if (elements.signOut) {
    elements.signOut.style.display = currentUser ? 'block' : 'none';
  }
}

// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'APPLICATION_DETECTED') {
    // Refresh applications when background script detects new application
    loadApplications();
    showNotification('New application detected!', 'success');
  }
});

// Listen for storage changes
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (changes.applications) {
    applications = changes.applications.newValue || [];
    updateStats();
    updateRecentApplications();
  }
  
  if (changes.user) {
    currentUser = changes.user.newValue;
    updateUI();
  }
});