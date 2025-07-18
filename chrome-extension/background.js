// Service Worker for Job Application Tracker Extension
// Handles job detection, data sync, and background tasks

// Configuration
const SUPABASE_URL = 'https://nluywlsamqwqcohqycwk.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sdXl3bHNhbXF3cWNvaHF5Y3drIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1NDU0NDgsImV4cCI6MjA2ODEyMTQ0OH0.vPw8baaEUfNR_HdsDRj_utQHubMVjn5F4if2MA1h-2Y';

// Job site configurations for detection
const JOB_SITES = {
  'linkedin.com': {
    name: 'LinkedIn',
    selectors: {
      jobTitle: [
        '.job-details-jobs-unified-top-card__job-title h1',
        '.job-details-jobs-unified-top-card__job-title',
        '.jobs-unified-top-card__job-title h1',
        '[data-test-id="job-title"]'
      ],
      company: [
        '.job-details-jobs-unified-top-card__company-name a',
        '.jobs-unified-top-card__company-name a',
        '[data-test-id="job-poster-name"]'
      ],
      location: [
        '.job-details-jobs-unified-top-card__bullet',
        '.jobs-unified-top-card__bullet',
        '[data-test-id="job-location"]'
      ],
      applyButton: [
        '[data-control-name="jobdetails_topcard_inapply"]',
        '.jobs-apply-button',
        '[aria-label*="Apply"]'
      ]
    }
  },
  'indeed.com': {
    name: 'Indeed',
    selectors: {
      jobTitle: [
        '[data-jk] h1',
        '.jobsearch-JobInfoHeader-title',
        'h1[data-testid="jobTitle"]'
      ],
      company: [
        '[data-testid="inlineHeader-companyName"]',
        '.icl-u-lg-mr--sm.icl-u-xs-mr--xs',
        'a[data-testid="companyLink"]'
      ],
      location: [
        '[data-testid="job-location"]',
        '.icl-u-colorForeground--secondary.icl-u-xs-mt--xs'
      ],
      applyButton: [
        '[aria-label="Apply now"]',
        '.ia-IndeedApplyButton',
        '#indeedApplyButton'
      ]
    }
  },
  'glassdoor.com': {
    name: 'Glassdoor',
    selectors: {
      jobTitle: [
        '[data-test="job-title"]',
        '.e1tk4kwz4 h1',
        '.jobHeader h1'
      ],
      company: [
        '[data-test="employer-name"]',
        '.e1tk4kwz4 .employerName'
      ],
      location: [
        '[data-test="job-location"]',
        '.e1tk4kwz4 .location'
      ],
      applyButton: [
        '[data-test="apply-button"]',
        '.applyButton'
      ]
    }
  },
  'dice.com': {
    name: 'Dice',
    selectors: {
      jobTitle: [
        '[data-cy="jobTitle"]',
        '.jobTitle h1'
      ],
      company: [
        '[data-cy="companyName"]',
        '.companyName a'
      ],
      location: [
        '[data-cy="jobLocation"]',
        '.location'
      ],
      applyButton: [
        '[data-cy="applyButton"]',
        '.btn-apply'
      ]
    }
  },
  'ziprecruiter.com': {
    name: 'ZipRecruiter',
    selectors: {
      jobTitle: [
        'h1[data-testid="jobTitle"]',
        '.job_header h1'
      ],
      company: [
        '[data-testid="companyName"]',
        '.hiring_company a'
      ],
      location: [
        '[data-testid="jobLocation"]',
        '.location'
      ],
      applyButton: [
        '[data-testid="applyButton"]',
        '.apply_button'
      ]
    }
  },
  'monster.com': {
    name: 'Monster',
    selectors: {
      jobTitle: [
        'h1[data-testid="svx-job-title"]',
        '.job-header h1'
      ],
      company: [
        '[data-testid="svx-company-name"]',
        '.company-name'
      ],
      location: [
        '[data-testid="svx-job-location"]',
        '.location'
      ],
      applyButton: [
        '[data-testid="svx-apply-button"]',
        '.apply-button'
      ]
    }
  }
};

// Initialize extension
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Job Tracker Extension installed:', details.reason);
  
  if (details.reason === 'install') {
    // Set default settings
    chrome.storage.sync.set({
      settings: {
        autoDetection: true,
        notifications: true,
        theme: 'light'
      }
    });
  }
});

// Listen for tab updates to detect job applications
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    await handleTabUpdate(tabId, tab);
  }
});

// Handle tab updates
async function handleTabUpdate(tabId, tab) {
  try {
    const url = new URL(tab.url);
    const hostname = url.hostname.replace('www.', '');
    
    // Check if it's a supported job site
    if (JOB_SITES[hostname]) {
      // Get user settings
      const settings = await getSettings();
      if (!settings.autoDetection) return;
      
      // Inject content script if not already present
      await injectContentScript(tabId);
      
      // Start job detection
      setTimeout(() => {
        chrome.tabs.sendMessage(tabId, {
          type: 'DETECT_JOB_APPLICATION',
          siteConfig: JOB_SITES[hostname]
        });
      }, 2000); // Wait for page to fully load
    }
  } catch (error) {
    console.error('Error handling tab update:', error);
  }
}

// Inject content script
async function injectContentScript(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content.js']
    });
  } catch (error) {
    // Content script might already be injected
    console.log('Content script injection skipped:', error.message);
  }
}

// Get user settings
async function getSettings() {
  const result = await chrome.storage.sync.get(['settings']);
  return result.settings || {
    autoDetection: true,
    notifications: true,
    theme: 'light'
  };
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  try {
    switch (message.type) {
      case 'JOB_APPLICATION_DETECTED':
        await handleJobApplicationDetected(message.data, sender.tab);
        break;
        
      case 'SAVE_APPLICATION':
        await saveApplication(message.data);
        break;
        
      case 'SYNC_DATA':
        await syncApplicationData();
        break;
        
      case 'TEST_CONNECTION':
        await testConnection();
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  } catch (error) {
    console.error('Error handling message:', error);
    sendResponse({ error: error.message });
  }
  
  return true; // Keep message channel open for async response
});

// Handle detected job application
async function handleJobApplicationDetected(jobData, tab) {
  try {
    console.log('Job application detected:', jobData);
    
    // Get current user
    const userData = await chrome.storage.sync.get(['user', 'accessToken']);
    if (!userData.user) {
      console.log('No user signed in, skipping auto-save');
      return;
    }
    
    // Enhance job data with additional info
    const enhancedJobData = {
      ...jobData,
      user_id: userData.user.id,
      url: tab.url,
      date_applied: new Date().toISOString().split('T')[0],
      status: 'applied',
      application_type: detectApplicationType(jobData),
      created_at: new Date().toISOString()
    };
    
    // Check for duplicates
    const isDuplicate = await checkForDuplicate(enhancedJobData);
    if (isDuplicate) {
      console.log('Duplicate application detected, skipping');
      return;
    }
    
    // Save application
    await saveApplication(enhancedJobData);
    
    // Show notification
    const settings = await getSettings();
    if (settings.notifications) {
      showNotification(
        'Job Application Detected!',
        `Added: ${jobData.job_title} at ${jobData.company}`
      );
    }
    
    // Notify popup if open
    try {
      chrome.runtime.sendMessage({
        type: 'APPLICATION_DETECTED',
        data: enhancedJobData
      });
    } catch (error) {
      // Popup not open, ignore
    }
    
  } catch (error) {
    console.error('Error handling detected job application:', error);
  }
}

// Detect application type based on job data
function detectApplicationType(jobData) {
  const title = jobData.job_title?.toLowerCase() || '';
  const company = jobData.company?.toLowerCase() || '';
  const portal = jobData.portal_used?.toLowerCase() || '';
  
  if (portal.includes('linkedin') && jobData.isEasyApply) {
    return 'Easy Apply';
  } else if (portal.includes('indeed') && jobData.isEasyApply) {
    return 'Easy Apply';
  } else if (jobData.applicationMethod === 'quick') {
    return 'Easy Apply';
  } else {
    return 'Long Application';
  }
}

// Check for duplicate applications
async function checkForDuplicate(jobData) {
  try {
    const localData = await chrome.storage.local.get(['applications']);
    const applications = localData.applications || [];
    
    // Check for exact matches within the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    const duplicate = applications.find(app => {
      const appDate = new Date(app.created_at);
      return (
        app.job_title === jobData.job_title &&
        app.company === jobData.company &&
        app.portal_used === jobData.portal_used &&
        appDate > oneDayAgo
      );
    });
    
    return !!duplicate;
    
  } catch (error) {
    console.error('Error checking for duplicates:', error);
    return false;
  }
}

// Save application to both local storage and Supabase
async function saveApplication(applicationData) {
  try {
    console.log('Saving application:', applicationData);
    
    // Get access token
    const userData = await chrome.storage.sync.get(['accessToken']);
    const accessToken = userData.accessToken || SUPABASE_ANON_KEY;
    
    // Save to Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/applications`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(applicationData)
    });
    
    if (response.ok) {
      const savedApplication = await response.json();
      console.log('Application saved to Supabase:', savedApplication[0]);
      
      // Update local storage
      await updateLocalApplications(savedApplication[0]);
      
      return savedApplication[0];
    } else {
      const error = await response.text();
      console.error('Failed to save to Supabase:', error);
      
      // Save to local storage as fallback
      await saveToLocalStorage(applicationData);
      throw new Error('Failed to save to database');
    }
    
  } catch (error) {
    console.error('Error saving application:', error);
    
    // Fallback to local storage
    await saveToLocalStorage(applicationData);
    throw error;
  }
}

// Update local applications storage
async function updateLocalApplications(newApplication) {
  try {
    const localData = await chrome.storage.local.get(['applications']);
    const applications = localData.applications || [];
    
    // Add new application to the beginning of the array
    applications.unshift(newApplication);
    
    // Keep only the latest 1000 applications to prevent storage issues
    const limitedApplications = applications.slice(0, 1000);
    
    await chrome.storage.local.set({ applications: limitedApplications });
    console.log('Local applications updated');
    
  } catch (error) {
    console.error('Error updating local applications:', error);
  }
}

// Save to local storage as fallback
async function saveToLocalStorage(applicationData) {
  try {
    const localData = await chrome.storage.local.get(['applications', 'pendingSync']);
    const applications = localData.applications || [];
    const pendingSync = localData.pendingSync || [];
    
    // Generate temporary ID
    const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const applicationWithId = { ...applicationData, id: tempId };
    
    // Add to applications
    applications.unshift(applicationWithId);
    
    // Add to pending sync queue
    pendingSync.push(applicationWithId);
    
    await chrome.storage.local.set({
      applications: applications.slice(0, 1000),
      pendingSync
    });
    
    console.log('Application saved to local storage');
    
  } catch (error) {
    console.error('Error saving to local storage:', error);
  }
}

// Sync application data
async function syncApplicationData() {
  try {
    console.log('Starting data sync...');
    
    // Get user data
    const userData = await chrome.storage.sync.get(['user', 'accessToken']);
    if (!userData.user) {
      console.log('No user signed in, skipping sync');
      return;
    }
    
    // Sync pending applications first
    await syncPendingApplications();
    
    // Fetch latest applications from Supabase
    const response = await fetch(`${SUPABASE_URL}/rest/v1/applications?user_id=eq.${userData.user.id}&order=created_at.desc&limit=1000`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${userData.accessToken || SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const applications = await response.json();
      await chrome.storage.local.set({ applications });
      console.log(`Synced ${applications.length} applications`);
    } else {
      console.error('Failed to fetch applications from Supabase');
    }
    
  } catch (error) {
    console.error('Error syncing data:', error);
  }
}

// Sync pending applications
async function syncPendingApplications() {
  try {
    const localData = await chrome.storage.local.get(['pendingSync']);
    const pendingSync = localData.pendingSync || [];
    
    if (pendingSync.length === 0) return;
    
    console.log(`Syncing ${pendingSync.length} pending applications...`);
    
    const userData = await chrome.storage.sync.get(['accessToken']);
    const accessToken = userData.accessToken || SUPABASE_ANON_KEY;
    
    const syncedIds = [];
    
    for (const application of pendingSync) {
      try {
        // Remove temporary ID and add timestamp if missing
        const { id, ...appData } = application;
        if (!appData.created_at) {
          appData.created_at = new Date().toISOString();
        }
        
        const response = await fetch(`${SUPABASE_URL}/rest/v1/applications`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(appData)
        });
        
        if (response.ok) {
          syncedIds.push(id);
          console.log('Synced pending application:', appData.job_title);
        }
        
      } catch (error) {
        console.error('Error syncing individual application:', error);
      }
    }
    
    // Remove synced applications from pending queue
    if (syncedIds.length > 0) {
      const remainingPending = pendingSync.filter(app => !syncedIds.includes(app.id));
      await chrome.storage.local.set({ pendingSync: remainingPending });
    }
    
  } catch (error) {
    console.error('Error syncing pending applications:', error);
  }
}

// Test connection to Supabase
async function testConnection() {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY
      }
    });
    
    return response.ok;
    
  } catch (error) {
    console.error('Connection test failed:', error);
    return false;
  }
}

// Show notification
function showNotification(title, message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: title,
    message: message
  });
}

// Periodic sync (every 5 minutes)
setInterval(async () => {
  const userData = await chrome.storage.sync.get(['user']);
  if (userData.user) {
    await syncApplicationData();
  }
}, 5 * 60 * 1000);

// Sync on startup
chrome.runtime.onStartup.addListener(async () => {
  const userData = await chrome.storage.sync.get(['user']);
  if (userData.user) {
    await syncApplicationData();
  }
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  // This will open the popup (handled by manifest.json)
  console.log('Extension icon clicked');
});

console.log('Job Tracker background script loaded');