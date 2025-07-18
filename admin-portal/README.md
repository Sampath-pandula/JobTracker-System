# Job Tracker - Admin Portal

Administrative dashboard for managing the Job Tracker system.

## Features

- 🏠 **System Dashboard** - Overview of all system metrics
- 👥 **User Management** - Monitor and manage all registered users
- 📊 **System Analytics** - Comprehensive analytics across all users
- 📋 **User Activity** - Track user engagement and application patterns
- 🛡️ **Security Monitoring** - Monitor system health and security
- 📤 **Data Export** - Export system data for analysis
- ⚙️ **Admin Settings** - Configure system-wide settings

## Admin Access

### Demo Credentials:
- **Super Admin**: admin@jobtracker.com / AdminSecure123!
- **Manager**: manager@jobtracker.com / ManagerSecure123!

### Security Features:
- Separate admin authentication system
- Role-based access control
- Activity logging and monitoring
- Secure session management

## Getting Started

### Prerequisites

- Node.js 18 or later
- Supabase account with admin access
- Admin credentials

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/job-tracker-admin-portal.git
cd job-tracker-admin-portal
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Fill in your environment variables:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
ADMIN_SECRET_KEY=your_admin_secret_key
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000/admin/login](http://localhost:3000/admin/login) in your browser.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key (admin access) |
| `ADMIN_SECRET_KEY` | Secret key for admin authentication |

## Security Notes

⚠️ **IMPORTANT SECURITY CONSIDERATIONS:**

1. **Access Control**: This portal has full access to all user data
2. **Credentials**: Change default admin credentials in production
3. **Network**: Restrict access to admin portal (VPN, IP whitelist)
4. **Logging**: All admin actions are logged and monitored
5. **HTTPS**: Always use HTTPS in production
6. **Environment Variables**: Keep admin secrets secure

## Deployment

Deploy separately from user portal for security:

1. Use a different domain (e.g., admin.yourdomain.com)
2. Set up proper access controls
3. Configure monitoring and alerting
4. Regular security audits

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling with admin-specific design
- **Supabase** - Database with service role access
- **Framer Motion** - Animations
- **Recharts** - Advanced data visualization
- **React Hook Form** - Form handling

## Admin Functions

- Monitor user registration and activity
- View system-wide application statistics
- Export data for analysis
- Manage user accounts (activate/deactivate)
- Monitor system performance
- View audit logs

## Support

For admin portal issues:
1. Check logs in Vercel dashboard
2. Monitor Supabase logs
3. Review admin action logs
4. Contact system administrator

## License

This project is licensed under the MIT License.