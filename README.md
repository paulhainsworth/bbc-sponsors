# BBC Sponsor App

A web application for managing sponsor relationships and promotions for the Berkeley Bicycle Club.

## Features

- **Public Sponsor Directory**: Browse active sponsors and their promotions
- **Featured Promotions Carousel**: Highlighted offers on the homepage
- **Blog/News Section**: BBC admin-authored content about sponsors
- **Admin Dashboard**: Full sponsor and content management for BBC administrators
- **Sponsor Dashboard**: Self-service tools for sponsors to manage their profile and promotions
- **Slack Integration**: Automated notifications for new promotions and updates

## Tech Stack

- **Frontend**: SvelteKit with TypeScript
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel
- **Rich Text**: TipTap
- **Carousel**: Embla Carousel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project
- (Optional) Slack workspace with webhook URL

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd BBC-sponsor
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials and other configuration.

4. Set up Supabase:

   - Create a new Supabase project
   - Run the database migrations:
   ```bash
   npm run db:migrate
   ```
   
   This will create all necessary tables, functions, triggers, and RLS policies.

5. (Optional) Seed the database with test data:
```bash
npm run db:seed
```

6. Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Project Structure

```
src/
├── lib/
│   ├── components/     # Reusable Svelte components
│   ├── stores/         # Svelte stores for state management
│   ├── utils/          # Utility functions
│   └── types/          # TypeScript type definitions
├── routes/             # SvelteKit routes
│   ├── admin/          # BBC admin routes
│   ├── sponsor-admin/   # Sponsor admin routes
│   ├── sponsors/       # Public sponsor pages
│   ├── news/           # Blog/news pages
│   └── api/            # API endpoints
└── supabase/
    └── migrations/     # Database migration files
```

## Database Migrations

The database schema is defined in SQL migration files in `supabase/migrations/`:

- `001_initial_schema.sql`: Creates all tables and indexes
- `002_functions_and_triggers.sql`: Database functions and triggers
- `003_rls_policies.sql`: Row Level Security policies

Run migrations using:
```bash
npm run db:migrate
```

## User Roles

### Super Admin (BBC Admin)
- Full access to all features
- Manage sponsors and other admins
- Create blog posts
- Configure Slack integration

### Sponsor Admin
- Manage own sponsor profile
- Create/edit/delete own promotions
- Manage team members for their sponsor

## API Routes

### `/api/slack/notify`
POST endpoint for sending Slack notifications. Requires authentication via `SLACK_WEBHOOK_SECRET_KEY`.

### `/api/cron/expire-promotions`
POST endpoint for expiring promotions (called by Vercel cron). Requires authentication via `CRON_SECRET`.

## Deployment

### Vercel

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy

### Cron Jobs

Set up a Vercel cron job to call `/api/cron/expire-promotions` hourly:

```json
{
  "crons": [{
    "path": "/api/cron/expire-promotions",
    "schedule": "0 * * * *"
  }]
}
```

## Development

### Available Scripts

- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run preview`: Preview production build
- `npm run check`: Run TypeScript checks
- `npm run db:migrate`: Run database migrations
- `npm run db:seed`: Seed database with test data

### Code Style

- TypeScript for type safety
- Tailwind CSS for styling
- SvelteKit conventions for routing

## Environment Variables

See `.env.example` for all required environment variables.

## License

Private - Berkeley Bicycle Club

## Support

For issues or questions, contact the development team.

