# Job Tracker - Chrome Extension

Automatically track your job applications across major job sites.

## Features

- 🎯 **Auto Detection** - Automatically detects job applications on major sites
- 📊 **Dashboard** - View application statistics directly in the extension
- ✍️ **Manual Entry** - Manually add applications not auto-detected
- ⚙️ **Settings** - Configure detection preferences and sync settings
- 🔄 **Real-time Sync** - Syncs with your dashboard in real-time
- 🌙 **Dark Mode** - Matches your system theme preference

## Supported Job Sites

- LinkedIn (Easy Apply + standard applications)
- Indeed (Apply now + company redirects)
- Glassdoor (Easy Apply + standard applications)
- Dice (Quick Apply + standard applications)
- ZipRecruiter (1-Click Apply + standard)
- Monster (Quick Apply + standard)
- Generic detection for other job sites

## Installation

### From Chrome Web Store (Recommended)
1. Go to Chrome Web Store
2. Search for "Job Tracker"
3. Click "Add to Chrome"
4. Sign up for account at the user portal

### Manual Installation (Development)
1. Download the extension files
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" (top right)
4. Click "Load unpacked"
5. Select the extension folder
6. The extension will appear in your toolbar

## Setup

1. **Install Extension** - Add to Chrome
2. **Create Account** - Sign up at the user portal
3. **Sign In** - Enter your credentials in the extension
4. **Start Applying** - Apply to jobs normally; they'll be tracked automatically!

## How It Works

### Automatic Detection
The extension monitors supported job sites and automatically detects when you:
- Submit a job application
- Use "Easy Apply" or "Quick Apply" features
- Complete application forms

### Manual Entry
For jobs not auto-detected, you can manually add them:
1. Click the extension icon
2. Go to "Add Job" tab
3. Fill in job details
4. Click "Add Application"

### Data Sync
All data syncs in real-time with your dashboard where you can:
- View detailed analytics
- Export your data
- Manage applications
- Track your progress

## Privacy & Security

- ✅ Only tracks job application data
- ✅ Data is encrypted and stored securely
- ✅ No personal browsing data collected
- ✅ You own and control your data
- ✅ Can export or delete data anytime

## Permissions

The extension requests minimal permissions:
- **Active Tab**: To detect job applications on current page
- **Storage**: To store settings and sync data
- **Host Permissions**: Only for supported job sites
- **Background**: To sync data when browser is open

## Troubleshooting

### Application not detected?
1. Check if the site is supported
2. Ensure you're signed in to the extension
3. Try refreshing the page
4. Manually add the application if needed

### Data not syncing?
1. Check your internet connection
2. Verify you're signed in
3. Check extension permissions
4. Try signing out and back in

### Extension not working?
1. Check if extension is enabled
2. Try disabling and re-enabling
3. Clear browser cache
4. Reinstall the extension

## Development

### File Structure
```
chrome-extension/
├── manifest.json          # Extension configuration
├── popup.html             # Extension popup UI
├── popup.js               # Popup functionality
├── background.js          # Background service worker
├── content.js             # Content script for job sites
├── styles.css             # Popup styling
└── icons/                 # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### Building
1. Update manifest.json with production URLs
2. Test on all supported job sites
3. Create ZIP file for Chrome Web Store
4. Submit for review

### Testing
1. Load unpacked extension in Chrome
2. Test on each supported job site
3. Verify auto-detection works
4. Test manual entry
5. Confirm data syncs to dashboard

## Support

- 📧 Email: support@jobtracker.com
- 🐛 Bug Reports: GitHub Issues
- 💡 Feature Requests: GitHub Discussions
- 📖 Documentation: User Portal Help

## Version History

- **v1.0.0** - Initial release with auto-detection
- Features: LinkedIn, Indeed, Glassdoor support
- Manual entry and dashboard sync

## Contributing

1. Fork the repository
2. Create a feature branch
3. Test on multiple job sites
4. Submit a pull request

## License

This project is licensed under the MIT License.