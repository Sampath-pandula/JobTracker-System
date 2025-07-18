# Job Tracker - Integration & Customization Guide

This guide explains how all components of the Job Tracker system work together and how to customize them for your needs.

## System Architecture Overview

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Chrome Extension  │    │    User Portal      │    │   Admin Portal      │
│                     │    │                     │    │                     │
│ - Auto Detection    │    │ - Authentication    │    │ - System Analytics  │
│ - Manual Entry      │    │ - Dashboard         │    │ - User Management   │
│ - Real-time Sync    │    │ - Analytics         │    │ - Reports           │
│ - Settings          │    │ - Export            │    │ - Monitoring        │
└─────────┬───────────┘    └─────────┬───────────┘    └─────────┬───────────┘
          │                          │                          │
          │                          │                          │
          └──────────────────────────┼──────────────────────────┘
                                     │
                           ┌─────────▼───────────┐
                           │   Supabase Database │
                           │                     │
                           │ - PostgreSQL        │
                           │ - Real-time API     │
                           │ - Authentication    │
                           │ - Row Level Security│
                           └─────────────────────┘
```

## Data Flow Architecture

### 1. User Registration Flow

```
User → User Portal → Supabase Auth → Database (users table)
```

1. User visits User Portal
2. Completes registration form
3. Supabase creates auth user
4. Trigger creates user record in `users` table
5. User receives confirmation email
6. User can now install Chrome extension

### 2. Job Application Detection Flow

```
Job Site → Chrome Extension → Background Script → Supabase → User Portal
```

1. User applies to job on supported site
2. Content script detects application submission
3. Extracts job details (title, company, etc.)
4. Background script processes and validates data
5. Sends to Supabase via API
6. Real-time subscription updates User Portal
7. Admin Portal receives aggregated data

### 3. Manual Application Entry Flow

```
User → Extension Popup → Validation → Supabase → Real-time Update
```

1. User opens extension popup
2. Fills out manual application form
3. Client-side validation
4. Sends to Supabase
5. Updates appear in User Portal immediately

### 4. Admin Monitoring Flow

```
All Data → Supabase → Aggregation → Admin Portal → Analytics
```

1. All user activities stored in database
2. Admin Portal queries aggregated data
3. Real-time updates for system monitoring
4. Generates reports and analytics

## Component Integration Details

### Chrome Extension ↔ Supabase

**Authentication:**
```javascript
// Extension uses Supabase auth tokens
const { data: { user }, error } = await supabase.auth.getUser()
```

**Data Submission:**
```javascript
// Applications sent to database
const { data, error } = await supabase
  .from('applications')
  .insert({
    user_id: user.id,
    job_title: 'Software Engineer',
    company: 'Tech Corp',
    // ... other fields
  })
```

**Real-time Sync:**
```javascript
// Listen for changes
supabase
  .channel('applications')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'applications',
    filter: `user_id=eq.${user.id}`
  }, (payload) => {
    // Update extension UI
  })
  .subscribe()
```

### User Portal ↔ Supabase

**Row Level Security:**
```sql
-- Users can only see their own data
CREATE POLICY "Users can view own applications" ON applications
    FOR SELECT USING (auth.uid()::text = user_id::text);
```

**Real-time Dashboard:**
```javascript
// Live updates in dashboard
useEffect(() => {
  const subscription = supabase
    .channel('applications')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'applications',
      filter: `user_id=eq.${user.id}`
    }, () => {
      // Refresh dashboard data
      loadApplications()
    })
    .subscribe()

  return () => subscription.unsubscribe()
}, [])
```

### Admin Portal ↔ Supabase

**Service Role Access:**
```javascript
// Admin uses service role for full access
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)
```

**System Analytics:**
```sql
-- Custom functions for admin analytics
SELECT get_system_stats();
```

## Customization Guide

### Adding New Job Sites

To support additional job sites, modify the Chrome extension:

**1. Update manifest.json permissions:**
```json
{
  "host_permissions": [
    "https://newjobsite.com/*"
  ]
}
```

**2. Add site configuration in background.js:**
```javascript
const JOB_SITES = {
  'newjobsite.com': {
    name: 'New Job Site',
    selectors: {
      jobTitle: ['.job-title', 'h1.title'],
      company: ['.company-name', '.employer'],
      location: ['.location', '.job-location'],
      applyButton: ['.apply-btn', '[data-apply]']
    }
  }
}
```

**3. Update content script detection patterns:**
```javascript
const DETECTION_PATTERNS = {
  'newjobsite.com': {
    applicationSubmitted: [
      'Application submitted successfully',
      'Your application has been sent'
    ],
    urlPatterns: ['/jobs/', '/careers/']
  }
}
```

### Customizing User Portal

**Add new dashboard widgets:**

1. Create component in `components/dashboard/`
2. Add to dashboard page
3. Connect to Supabase data

**Example custom widget:**
```typescript
// components/dashboard/CustomWidget.tsx
export function CustomWidget() {
  const [data, setData] = useState([])
  const { supabase, user } = useSupabase()

  useEffect(() => {
    loadCustomData()
  }, [])

  const loadCustomData = async () => {
    const { data, error } = await supabase
      .from('applications')
      .select('*')
      .eq('user_id', user.id)
      // Custom query logic
    
    setData(data)
  }

  return (
    <div className="card p-6">
      <h3>Custom Analytics</h3>
      {/* Custom visualization */}
    </div>
  )
}
```

### Extending Database Schema

**Add new tables:**
```sql
-- Add application notes table
CREATE TABLE application_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  application_id UUID REFERENCES applications(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add RLS policy
CREATE POLICY "Users can manage own notes" ON application_notes
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM applications 
      WHERE applications.id = application_notes.application_id 
      AND applications.user_id::text = auth.uid()::text
    )
  );
```

**Add new fields to existing tables:**
```sql
-- Add salary negotiation tracking
ALTER TABLE applications 
ADD COLUMN salary_negotiated BOOLEAN DEFAULT FALSE,
ADD COLUMN final_salary_offer VARCHAR;
```

### API Extensions

**Add custom API endpoints:**

```typescript
// app/api/custom-analytics/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient({ cookies })
  
  // Custom analytics logic
  const { data, error } = await supabase
    .rpc('get_custom_analytics', { user_id: userId })
  
  return Response.json(data)
}
```

**Add database functions:**
```sql
-- Custom analytics function
CREATE OR REPLACE FUNCTION get_custom_analytics(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'custom_metric', COUNT(*),
        'other_data', AVG(some_field)
    ) INTO result
    FROM applications
    WHERE user_id = user_uuid;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Advanced Integrations

### Webhook Integration

Set up webhooks for external systems:

```typescript
// app/api/webhooks/application-created/route.ts
export async function POST(request: Request) {
  const payload = await request.json()
  
  // Verify webhook signature
  const isValid = verifySignature(payload)
  if (!isValid) return new Response('Unauthorized', { status: 401 })
  
  // Process webhook
  await processApplicationWebhook(payload)
  
  return new Response('OK')
}
```

### Email Notifications

Integrate with email services:

```typescript
// lib/email-service.ts
import { Resend } from 'resend'

export async function sendApplicationAlert(user: User, application: Application) {
  const resend = new Resend(process.env.RESEND_API_KEY)
  
  await resend.emails.send({
    from: 'notifications@jobtracker.com',
    to: user.email,
    subject: 'New Job Application Tracked',
    html: `
      <h1>New Application Tracked</h1>
      <p>Job: ${application.job_title}</p>
      <p>Company: ${application.company}</p>
    `
  })
}
```

### Analytics Integration

Connect to analytics services:

```typescript
// lib/analytics.ts
import { Analytics } from '@segment/analytics-js'

export const analytics = Analytics.load({
  writeKey: process.env.NEXT_PUBLIC_SEGMENT_WRITE_KEY
})

export function trackApplicationSubmitted(application: Application) {
  analytics.track('Application Submitted', {
    jobTitle: application.job_title,
    company: application.company,
    portal: application.portal_used
  })
}
```

### Export Integrations

Add custom export formats:

```typescript
// lib/exporters/google-sheets.ts
export async function exportToGoogleSheets(applications: Application[]) {
  const sheets = google.sheets({ version: 'v4', auth })
  
  const values = applications.map(app => [
    app.job_title,
    app.company,
    app.date_applied,
    app.status
  ])
  
  await sheets.spreadsheets.values.update({
    spreadsheetId: 'your-sheet-id',
    range: 'A1',
    valueInputOption: 'RAW',
    requestBody: { values }
  })
}
```

## Performance Optimization

### Database Optimization

**Indexes for performance:**
```sql
-- Optimize common queries
CREATE INDEX CONCURRENTLY idx_applications_user_date 
ON applications(user_id, date_applied DESC);

CREATE INDEX CONCURRENTLY idx_applications_status_portal 
ON applications(status, portal_used);
```

**Query optimization:**
```sql
-- Use materialized views for complex analytics
CREATE MATERIALIZED VIEW user_stats AS
SELECT 
  user_id,
  COUNT(*) as total_applications,
  COUNT(*) FILTER (WHERE status = 'offer') as offers,
  MAX(date_applied) as last_application
FROM applications
GROUP BY user_id;

-- Refresh periodically
REFRESH MATERIALIZED VIEW user_stats;
```

### Caching Strategy

**Redis caching:**
```typescript
// lib/cache.ts
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

export async function getCachedStats(userId: string) {
  const cached = await redis.get(`user_stats:${userId}`)
  if (cached) return JSON.parse(cached)
  
  // Fetch from database
  const stats = await fetchUserStats(userId)
  
  // Cache for 5 minutes
  await redis.setex(`user_stats:${userId}`, 300, JSON.stringify(stats))
  
  return stats
}
```

### Rate Limiting

**API rate limiting:**
```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
})

export async function middleware(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1'
  const { success } = await ratelimit.limit(ip)
  
  if (!success) {
    return new Response('Rate limited', { status: 429 })
  }
}
```

## Security Considerations

### Input Validation

```typescript
// lib/validation.ts
import { z } from 'zod'

export const applicationSchema = z.object({
  job_title: z.string().min(1).max(200),
  company: z.string().min(1).max(100),
  location: z.string().max(100).optional(),
  salary_info: z.string().max(50).optional(),
  url: z.string().url().optional(),
  notes: z.string().max(1000).optional(),
})
```

### CSRF Protection

```typescript
// lib/csrf.ts
import { createHash, randomBytes } from 'crypto'

export function generateCSRFToken(): string {
  return randomBytes(32).toString('hex')
}

export function verifyCSRFToken(token: string, expected: string): boolean {
  return createHash('sha256').update(token).digest('hex') === 
         createHash('sha256').update(expected).digest('hex')
}
```

### Content Security Policy

```typescript
// next.config.js
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline';
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self';
      connect-src 'self' https://*.supabase.co;
    `.replace(/\s{2,}/g, ' ').trim()
  }
]
```

## Testing Strategy

### Unit Tests

```typescript
// __tests__/components/Dashboard.test.tsx
import { render, screen } from '@testing-library/react'
import Dashboard from '@/components/Dashboard'

test('renders dashboard with applications', async () => {
  const mockApplications = [
    { id: '1', job_title: 'Developer', company: 'Tech Co' }
  ]
  
  render(<Dashboard applications={mockApplications} />)
  
  expect(screen.getByText('Developer')).toBeInTheDocument()
  expect(screen.getByText('Tech Co')).toBeInTheDocument()
})
```

### Integration Tests

```typescript
// __tests__/api/applications.test.ts
import { createMocks } from 'node-mocks-http'
import handler from '@/pages/api/applications'

test('POST /api/applications creates application', async () => {
  const { req, res } = createMocks({
    method: 'POST',
    body: {
      job_title: 'Software Engineer',
      company: 'Tech Corp'
    }
  })
  
  await handler(req, res)
  
  expect(res._getStatusCode()).toBe(201)
})
```

### E2E Tests

```typescript
// e2e/application-flow.spec.ts
import { test, expect } from '@playwright/test'

test('user can create and view application', async ({ page }) => {
  await page.goto('/dashboard')
  
  await page.click('[data-testid="add-application"]')
  await page.fill('[name="job_title"]', 'Software Engineer')
  await page.fill('[name="company"]', 'Tech Corp')
  await page.click('[type="submit"]')
  
  await expect(page.locator('text=Software Engineer')).toBeVisible()
  await expect(page.locator('text=Tech Corp')).toBeVisible()
})
```

## Monitoring & Logging

### Application Monitoring

```typescript
// lib/monitoring.ts
import * as Sentry from '@sentry/nextjs'

export function initMonitoring() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  })
}

export function trackError(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, { extra: context })
}
```

### Database Monitoring

```sql
-- Monitor slow queries
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 1000
ORDER BY mean_exec_time DESC;

-- Monitor table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

## Deployment Automation

### GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
```

### Database Migrations

```sql
-- migrations/002_add_salary_tracking.sql
ALTER TABLE applications 
ADD COLUMN IF NOT EXISTS salary_negotiated BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS final_salary_offer VARCHAR;

-- Create migration tracking
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR NOT NULL,
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO migrations (filename) VALUES ('002_add_salary_tracking.sql');
```

## Conclusion

This integration guide provides the foundation for customizing and extending the Job Tracker system. The modular architecture allows for easy modification and scaling as your needs grow.

Key takeaways:
- All components communicate through Supabase
- Row Level Security ensures data isolation
- Real-time updates keep all interfaces synchronized
- The system is designed for easy customization
- Performance and security are built-in considerations

For additional help or custom development, refer to the documentation of each individual component or reach out to the development team.