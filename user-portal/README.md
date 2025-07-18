# Job Tracker - User Portal

A modern dashboard for tracking job applications automatically.

## Features

- 🎯 **Dashboard Overview** - See all your applications at a glance
- 📊 **Analytics** - Track your job search progress with interactive charts
- 📋 **Application Management** - View, edit, and organize your applications
- 📤 **Data Export** - Export your data in CSV, PDF, or JSON formats
- ⚙️ **Settings** - Customize your experience and preferences
- 🌙 **Dark Mode** - Switch between light and dark themes
- 📱 **Mobile Responsive** - Works perfectly on all devices

## Getting Started

### Prerequisites

- Node.js 18 or later
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/job-tracker-user-portal.git
cd job-tracker-user-portal
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
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Environment Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |

## Deployment

This app is designed to be deployed on Vercel:

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Set the environment variables in Vercel
4. Deploy!

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Supabase** - Database and authentication
- **Framer Motion** - Animations
- **Recharts** - Data visualization
- **React Hook Form** - Form handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.