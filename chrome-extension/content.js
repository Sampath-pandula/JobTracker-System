// Content Script for Job Application Tracker
// Injected into job sites to detect and extract job application data

(function() {
    'use strict';
  
    // Prevent multiple injections
    if (window.jobTrackerContentScript) {
      return;
    }
    window.jobTrackerContentScript = true;
  
    console.log('Job Tracker content script loaded on:', window.location.hostname);
  
    // Configuration
    let siteConfig = null;
    let isDetectionActive = false;
    let lastDetectedJob = null;
    let observers = [];
  
    // Job detection patterns for different sites
    const DETECTION_PATTERNS = {
      'linkedin.com': {
        applicationSubmitted: [
          'Your application was sent',
          'Application sent',
          'Your application has been submitted',
          'Thank you for your interest'
        ],
        easyApplyIndicators: [
          'Easy Apply',
          'data-control-name="jobdetails_topcard_inapply"',
          '.jobs-apply-button--top-card'
        ],
        urlPatterns: [
          '/jobs/view/',
          '/jobs/collections/',
          '/jobs/search/'
        ]
      },
      'indeed.com': {
        applicationSubmitted: [
          'Application submitted',
          'Your application has been submitted',
          'Application sent to',
          'Thank you for applying'
        ],
        easyApplyIndicators: [
          'Apply now',
          'Indeed Apply',
          '.ia-IndeedApplyButton'
        ],
        urlPatterns: [
          '/viewjob?jk=',
          '/jobs/view/',
          '/m/jobs/view/'
        ]
      },
      'glassdoor.com': {
        applicationSubmitted: [
          'Application submitted',
          'Your application was submitted',
          'Application sent',
          'Thank you for applying'
        ],
        easyApplyIndicators: [
          'Easy Apply',
          'Quick Apply'
        ],
        urlPatterns: [
          '/job-listing/',
          '/Jobs/',
          '/partner/jobListing'
        ]
      },
      'dice.com': {
        applicationSubmitted: [
          'Application submitted',
          'Your application has been submitted',
          'Application sent'
        ],
        easyApplyIndicators: [
          'Easy Apply',
          'Quick Apply'
        ],
        urlPatterns: [
          '/job-detail/',
          '/jobs/detail/'
        ]
      },
      'ziprecruiter.com': {
        applicationSubmitted: [
          'Application submitted',
          'Your application was submitted',
          'Application sent'
        ],
        easyApplyIndicators: [
          'Quick Apply',
          '1-Click Apply'
        ],
        urlPatterns: [
          '/jobs/',
          '/c/'
        ]
      },
      'monster.com': {
        applicationSubmitted: [
          'Application submitted',
          'Your application has been submitted',
          'Thank you for applying'
        ],
        easyApplyIndicators: [
          'Quick Apply',
          'Easy Apply'
        ],
        urlPatterns: [
          '/job-openings/'
        ]
      }
    };
  
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (message.type === 'DETECT_JOB_APPLICATION') {
        siteConfig = message.siteConfig;
        startJobDetection();
      }
    });
  
    // Start job detection
    function startJobDetection() {
      if (isDetectionActive) return;
      
      console.log('Starting job detection for:', siteConfig.name);
      isDetectionActive = true;
  
      // Check if we're on a job details page
      if (!isJobDetailsPage()) {
        console.log('Not on a job details page, skipping detection');
        return;
      }
  
      // Extract current job information
      const jobData = extractJobData();
      if (jobData && jobData.job_title && jobData.company) {
        lastDetectedJob = jobData;
        console.log('Job data extracted:', jobData);
      }
  
      // Set up application detection
      setupApplicationDetection();
      
      // Set up URL change detection for SPAs
      setupUrlChangeDetection();
    }
  
    // Check if current page is a job details page
    function isJobDetailsPage() {
      const hostname = window.location.hostname.replace('www.', '');
      const patterns = DETECTION_PATTERNS[hostname]?.urlPatterns || [];
      
      return patterns.some(pattern => window.location.pathname.includes(pattern)) ||
             window.location.search.includes('jk=') || // Indeed job key
             document.querySelector('[data-jk]') || // Indeed job container
             document.querySelector('.job-details') || // Generic job details
             document.querySelector('.jobs-unified-top-card'); // LinkedIn
    }
  
    // Extract job data from the page
    function extractJobData() {
      if (!siteConfig) return null;
  
      const jobData = {
        portal_used: siteConfig.name,
        timestamp: new Date().toISOString()
      };
  
      // Extract job title
      jobData.job_title = extractTextFromSelectors(siteConfig.selectors.jobTitle);
      
      // Extract company name
      jobData.company = extractTextFromSelectors(siteConfig.selectors.company);
      
      // Extract location
      jobData.location = extractTextFromSelectors(siteConfig.selectors.location);
      
      // Extract salary if available
      jobData.salary_info = extractSalaryInfo();
      
      // Extract job description snippet
      jobData.description = extractJobDescription();
      
      // Detect if it's an easy apply
      jobData.isEasyApply = detectEasyApply();
      
      // Clean up extracted data
      Object.keys(jobData).forEach(key => {
        if (typeof jobData[key] === 'string') {
          jobData[key] = jobData[key].trim();
          if (jobData[key] === '') {
            delete jobData[key];
          }
        }
      });
  
      return jobData;
    }
  
    // Extract text from multiple selectors
    function extractTextFromSelectors(selectors) {
      if (!selectors) return null;
      
      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
          let text = element.textContent || element.innerText || '';
          
          // Clean up text
          text = text.replace(/\s+/g, ' ').trim();
          
          // Remove common prefixes/suffixes
          text = text.replace(/^(Job Title:|Company:|Location:)/i, '');
          text = text.replace(/\(.*?\)$/, ''); // Remove trailing parentheses
          
          if (text && text.length > 2) {
            return text;
          }
        }
      }
      return null;
    }
  
    // Extract salary information
    function extractSalaryInfo() {
      const salarySelectors = [
        '[data-testid="salary"]',
        '.salary',
        '.pay',
        '.compensation',
        '.wage',
        '[class*="salary"]',
        '[class*="pay"]'
      ];
  
      const salaryPatterns = [
        /\$[\d,]+(?:\.\d{2})?(?:\s*-\s*\$[\d,]+(?:\.\d{2})?)?(?:\s*(?:per|\/)\s*(?:hour|hr|year|annually|month|weekly))?/gi,
        /[\d,]+k(?:\s*-\s*[\d,]+k)?(?:\s*(?:per|\/)\s*(?:year|annually))?/gi
      ];
  
      // Try salary-specific selectors first
      for (const selector of salarySelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent.trim();
          if (text) return text;
        }
      }
  
      // Search page text for salary patterns
      const pageText = document.body.textContent;
      for (const pattern of salaryPatterns) {
        const matches = pageText.match(pattern);
        if (matches && matches.length > 0) {
          return matches[0];
        }
      }
  
      return null;
    }
  
    // Extract job description snippet
    function extractJobDescription() {
      const descriptionSelectors = [
        '.job-description',
        '.jobDescription',
        '[data-testid="job-description"]',
        '.description',
        '.job-details',
        '.jobDetails'
      ];
  
      for (const selector of descriptionSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          let text = element.textContent.trim();
          if (text.length > 50) {
            // Return first 200 characters
            return text.substring(0, 200) + (text.length > 200 ? '...' : '');
          }
        }
      }
  
      return null;
    }
  
    // Detect if it's an easy apply job
    function detectEasyApply() {
      const hostname = window.location.hostname.replace('www.', '');
      const patterns = DETECTION_PATTERNS[hostname]?.easyApplyIndicators || [];
  
      for (const pattern of patterns) {
        if (pattern.startsWith('.') || pattern.startsWith('[')) {
          // It's a selector
          if (document.querySelector(pattern)) {
            return true;
          }
        } else {
          // It's text to search for
          if (document.body.textContent.includes(pattern)) {
            return true;
          }
        }
      }
  
      return false;
    }
  
    // Setup application detection
    function setupApplicationDetection() {
      const hostname = window.location.hostname.replace('www.', '');
      const submissionPatterns = DETECTION_PATTERNS[hostname]?.applicationSubmitted || [];
  
      // Watch for application submission messages
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const text = node.textContent || '';
              
              // Check for submission confirmation messages
              for (const pattern of submissionPatterns) {
                if (text.toLowerCase().includes(pattern.toLowerCase())) {
                  console.log('Application submission detected:', pattern);
                  handleApplicationSubmission();
                  return;
                }
              }
            }
          });
        });
      });
  
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
  
      observers.push(observer);
  
      // Also listen for button clicks on apply buttons
      setupApplyButtonDetection();
    }
  
    // Setup apply button detection
    function setupApplyButtonDetection() {
      if (!siteConfig.selectors.applyButton) return;
  
      const applyButtons = [];
      
      // Find all potential apply buttons
      siteConfig.selectors.applyButton.forEach(selector => {
        const buttons = document.querySelectorAll(selector);
        buttons.forEach(button => applyButtons.push(button));
      });
  
      // Add click listeners to apply buttons
      applyButtons.forEach(button => {
        if (button && !button.dataset.trackerListener) {
          button.dataset.trackerListener = 'true';
          
          button.addEventListener('click', () => {
            console.log('Apply button clicked');
            
            // Wait a bit for the application to be processed
            setTimeout(() => {
              checkForApplicationSuccess();
            }, 3000);
          });
        }
      });
    }
  
    // Check for application success after button click
    function checkForApplicationSuccess() {
      const hostname = window.location.hostname.replace('www.', '');
      const submissionPatterns = DETECTION_PATTERNS[hostname]?.applicationSubmitted || [];
  
      // Check if any success message is visible
      for (const pattern of submissionPatterns) {
        const elements = document.querySelectorAll('*');
        for (const element of elements) {
          const text = element.textContent || '';
          if (text.toLowerCase().includes(pattern.toLowerCase()) && 
              isElementVisible(element)) {
            console.log('Application success message found:', pattern);
            handleApplicationSubmission();
            return;
          }
        }
      }
  
      // Check for URL changes that indicate success
      if (window.location.href.includes('success') || 
          window.location.href.includes('confirmation') ||
          window.location.href.includes('thank-you')) {
        console.log('Success URL detected');
        handleApplicationSubmission();
      }
    }
  
    // Check if element is visible
    function isElementVisible(element) {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && 
             style.visibility !== 'hidden' && 
             style.opacity !== '0';
    }
  
    // Handle application submission
    function handleApplicationSubmission() {
      if (!lastDetectedJob) {
        console.log('No job data available for submission');
        return;
      }
  
      console.log('Handling application submission for:', lastDetectedJob);
  
      // Send to background script
      chrome.runtime.sendMessage({
        type: 'JOB_APPLICATION_DETECTED',
        data: lastDetectedJob
      }).catch(error => {
        console.error('Error sending application data:', error);
      });
  
      // Prevent duplicate submissions
      lastDetectedJob = null;
    }
  
    // Setup URL change detection for Single Page Applications
    function setupUrlChangeDetection() {
      let currentUrl = window.location.href;
  
      const urlObserver = new MutationObserver(() => {
        if (window.location.href !== currentUrl) {
          currentUrl = window.location.href;
          console.log('URL changed to:', currentUrl);
          
          // Reset detection for new page
          setTimeout(() => {
            if (isJobDetailsPage()) {
              const newJobData = extractJobData();
              if (newJobData && newJobData.job_title && newJobData.company) {
                lastDetectedJob = newJobData;
                console.log('New job data extracted:', newJobData);
              }
            }
          }, 1000);
        }
      });
  
      urlObserver.observe(document.body, {
        childList: true,
        subtree: true
      });
  
      observers.push(urlObserver);
  
      // Also listen for popstate events
      window.addEventListener('popstate', () => {
        setTimeout(() => {
          if (isJobDetailsPage()) {
            const newJobData = extractJobData();
            if (newJobData && newJobData.job_title && newJobData.company) {
              lastDetectedJob = newJobData;
              console.log('Job data updated after popstate:', newJobData);
            }
          }
        }, 1000);
      });
    }
  
    // Cleanup function
    function cleanup() {
      observers.forEach(observer => observer.disconnect());
      observers = [];
      isDetectionActive = false;
    }
  
    // Cleanup on page unload
    window.addEventListener('beforeunload', cleanup);
  
    // Initial setup - try to detect immediately if we're on a job page
    setTimeout(() => {
      if (isJobDetailsPage() && !isDetectionActive) {
        // Request site config from background script
        chrome.runtime.sendMessage({
          type: 'REQUEST_SITE_CONFIG',
          hostname: window.location.hostname.replace('www.', '')
        }).catch(error => {
          console.log('Could not request site config:', error);
        });
      }
    }, 2000);
  
    console.log('Job Tracker content script initialized');
  
  })();