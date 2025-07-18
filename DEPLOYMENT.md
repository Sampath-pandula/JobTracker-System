# Job Tracker - Complete Deployment Guide

This guide will walk you through deploying the complete Job Tracker system to production.

## System Overview

The Job Tracker system consists of:
- **Chrome Extension**: Tracks job applications automatically
- **User Portal**: Next.js app for individual users (Vercel)
- **Admin Portal**: Next.js app for system administration (Vercel)
- **Database**: Supabase PostgreSQL with real-time features

## Prerequisites

- Supabase account (free tier available)
- Vercel account (free tier available)
- GitHub account
- Chrome Web Store Developer account ($5 one-time fee)
- Node.js 18+ installed locally

## Step 1: Database Setup (Supabase)

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization
4. Set project name: `job-tracker`
5. Set database password (save this securely)
6. Select region closest to your users
7. Click "Create new project"

### 1.2 Configure Database

1. Wait for project to be ready (2-3 minutes)
2. Go to SQL Editor in your Supabase dashboard
3. Copy and paste the entire `schema.sql` file content
4. Click "Run" to execute the schema
5. Verify tables were created in Table Editor

### 1.3 Get Credentials

1. Go to Settings → API
2. Copy these values (you'll need them later):
   - Project URL: `https://your-project.supabase.co`
   - `anon` public key
   - `service_role` secret key (keep this secure!)

### 1.4 Configure Authentication

1. Go to Authentication → Settings
2. Set Site URL to: `https://job-tracker-user-portal-omega.vercel.app`
3. Add additional redirect URLs:
   - `http://localhost:3000` (for development)
   - `https://job-tracker-admin-portal.vercel.app`
4. Enable Email auth provider
5. Configure email templates (optional)
6. For Google OAuth (optional):
   - Go to Providers
   - Enable Google
   - Add your Google OAuth credentials

## Step 2: User Portal Deployment (Vercel)

### 2.1 Prepare Repository

1. Create new GitHub repository: `job-tracker-user-portal`
2. Upload all User Portal files to this repository
3. Ensure `package.json`, `next.config.js`, and `vercel.json` are in the root

### 2.2 Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your `job-tracker-user-portal` repository
4. Configure project:
   - Framework Preset: Next.js
   - Root Directory: ./
   - Build Command: `npm run build`
   - Output Directory: Leave empty (default)
   - Install Command: `npm install`

### 2.3 Configure Environment Variables

In Vercel project settings, add these environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXTAUTH_URL=https://job-tracker-user-portal-omega.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret_here
```

### 2.4 Configure Custom Domain (Optional)

1. Go to Project Settings → Domains
2. Add your custom domain: `job-tracker-user-portal-omega.vercel.app`
3. Follow DNS configuration instructions
4. Update Supabase Site URL to match your domain

### 2.5 Deploy

1. Click "Deploy" in Vercel
2. Wait for build to complete (3-5 minutes)
3. Visit your deployed site to verify it works
4. Test user registration and login

## Step 3: Admin Portal Deployment (Vercel)

### 3.1 Prepare Repository

1. Create new GitHub repository: `job-tracker-admin-portal`
2. Upload all Admin Portal files to this repository
3. Ensure all configuration files are in place

### 3.2 Deploy to Vercel

1. In Vercel, click "New Project"
2. Import your `job-tracker-admin-portal` repository
3. Configure the same way as User Portal

### 3.3 Configure Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
ADMIN_SECRET_KEY=your_secure_admin_secret_here
```

### 3.4 Set Custom Domain

1. Configure domain: `job-tracker-admin-portal.vercel.app`
2. Update DNS settings
3. Verify deployment

### 3.5 Test Admin Access

1. Visit your admin portal
2. Login with:
   - Email: `admin@jobtracker.com`
   - Password: `AdminSecure123!`
3. Verify dashboard loads with system stats

## Step 4: Chrome Extension Deployment

### 4.1 Prepare Extension Package

1. Create a folder with all Chrome Extension files
2. Ensure `manifest.json` is in the root
3. Update popup.js with your production URLs:
   ```javascript
   const SUPABASE_URL = 'https://your-project.supabase.co';
   const SUPABASE_ANON_KEY = 'your_anon_key_here';
   const USER_PORTAL_URL = 'https://job-tracker-user-portal-omega.vercel.app';
   ```

### 4.2 Create Extension Package

1. Create icons folder with required sizes:
   - 16x16px icon (icon16.png)
   - 48x48px icon (icon48.png)
   - 128x128px icon (icon128.png)
2. Zip the entire extension folder
3. Test locally first:
   - Go to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select your extension folder
   - Test functionality

### 4.3 Publish to Chrome Web Store

1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Pay $5 developer registration fee (one-time)
3. Click "New Item"
4. Upload your extension zip file
5. Fill out store listing:
   - Title: "Job Application Tracker"
   - Description: Use the description from manifest.json
   - Category: Productivity
   - Screenshots: Take screenshots of the extension in action
   - Privacy policy: Create and link to privacy policy
6. Submit for review (takes 1-3 days)

## Step 5: Post-Deployment Configuration

### 5.1 Update CORS Settings

In Supabase dashboard:
1. Go to Settings → API
2. Add your domain to CORS origins:
   - `https://job-tracker-user-portal-omega.vercel.app`
   - `https://job-tracker-admin-portal.vercel.app`
   - `chrome-extension://your-extension-id`

### 5.2 Configure Row Level Security

Verify RLS policies are working:
1. Test user can only see their own data
2. Test admin portal can see all data
3. Verify extension can write data

### 5.3 Set Up Monitoring

1. Enable Vercel Analytics for both portals
2. Set up Supabase monitoring
3. Configure error tracking (optional: Sentry)
4. Set up uptime monitoring (optional: UptimeRobot)

### 5.4 Configure Backups

1. In Supabase, enable automatic backups
2. Set backup schedule (daily recommended)
3. Test backup restoration process

## Step 6: Testing & Validation

### 6.1 End-to-End Testing

1. **Extension Testing**:
   - Install extension from Chrome Web Store
   - Test job application detection on major sites
   - Verify data appears in user portal
   - Test manual application entry

2. **User Portal Testing**:
   - Test user registration/login
   - Verify dashboard shows correct data
   - Test application management features
   - Test data export functionality
   - Test responsive design on mobile

3. **Admin Portal Testing**:
   - Test admin login
   - Verify all user data is visible
   - Test analytics and reporting
   - Test user management features

### 6.2 Performance Testing

1. Test page load speeds
2. Verify API response times
3. Test with multiple concurrent users
4. Monitor database performance

### 6.3 Security Testing

1. Verify RLS policies work correctly
2. Test authentication flows
3. Verify no sensitive data leaks
4. Test CSRF protection
5. Verify HTTPS is enforced

## Step 7: Production Checklist

- [ ] Database schema deployed and tested
- [ ] User portal deployed and accessible
- [ ] Admin portal deployed and accessible
- [ ] Chrome extension published and approved
- [ ] All environment variables configured
- [ ] CORS settings updated
- [ ] SSL certificates active
- [ ] Monitoring configured
- [ ] Backups enabled
- [ ] Error tracking configured
- [ ] Performance optimized
- [ ] Security tested
- [ ] Documentation updated
- [ ] Support channels ready

## Step 8: Go Live

### 8.1 Soft Launch

1. Start with limited beta users
2. Monitor system performance
3. Collect feedback
4. Fix any critical issues

### 8.2 Full Launch

1. Announce to broader audience
2. Monitor metrics closely
3. Scale resources if needed
4. Provide user support

## Maintenance & Updates

### Regular Tasks

1. **Daily**: Monitor error logs and performance
2. **Weekly**: Review user feedback and analytics
3. **Monthly**: Update dependencies and security patches
4. **Quarterly**: Review and optimize database performance

### Update Process

1. Test changes in development
2. Deploy to staging environment
3. Run full test suite
4. Deploy to production
5. Monitor for issues
6. Rollback if necessary

## Support & Troubleshooting

### Common Issues

1. **Extension not detecting applications**:
   - Check site selectors in content.js
   - Verify permissions in manifest.json
   - Check console errors

2. **Data not syncing**:
   - Verify Supabase connection
   - Check CORS settings
   - Verify RLS policies

3. **Portal not loading**:
   - Check environment variables
   - Verify Vercel deployment status
   - Check build logs

### Getting Help

- Check logs in Vercel dashboard
- Monitor Supabase logs
- Use browser developer tools
- Check Chrome extension console

## Cost Estimation

### Free Tier Usage

- **Supabase**: Up to 500MB database, 50MB file storage, 2GB bandwidth
- **Vercel**: 100GB bandwidth, 100 build hours, unlimited personal projects
- **Chrome Web Store**: $5 one-time developer fee

### Scaling Costs

- **Supabase Pro**: $25/month (8GB database, 100GB bandwidth)
- **Vercel Pro**: $20/month (1TB bandwidth, 400 build hours)

The system can handle hundreds of users on the free tier and thousands on paid tiers.

## Security Best Practices

1. Use HTTPS everywhere
2. Validate all inputs
3. Use parameterized queries
4. Implement rate limiting
5. Regular security audits
6. Keep dependencies updated
7. Use environment variables for secrets
8. Implement proper logging
9. Regular backups
10. Monitor for suspicious activity

## Performance Optimization

1. Optimize database queries
2. Use connection pooling
3. Implement caching
4. Optimize bundle sizes
5. Use CDN for static assets
6. Monitor Core Web Vitals
7. Implement lazy loading
8. Optimize images
9. Use compression
10. Monitor performance metrics

---

## Conclusion

Following this guide will give you a production-ready Job Tracker system. The system is designed to scale from individual users to thousands of users while maintaining performance and security.

Remember to:
- Monitor your system regularly
- Keep all components updated
- Backup your data regularly
- Provide good user support
- Iterate based on user feedback

Good luck with your deployment!