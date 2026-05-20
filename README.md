# TransLogiX: Unified Transport and Logistics Hub

A logistics management web app for managing transporters, vehicles, routes, shipments, and tracking.

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** PostgreSQL 16 (Docker) via Drizzle ORM
- **Authentication:** BetterAuth
- **Charts:** Recharts
- **Validation:** Zod
- **Date Utilities:** date-fns

## Features

- **Role-based Authentication** — Four roles: `ADMIN`, `TRANSPORTER`, `DRIVER`, `CUSTOMER`
- **Admin Dashboard** — Stats cards, charts, and full management views
- **Transporter CRUD** — Create, read, update, delete transporters
- **Vehicle CRUD** — Manage vehicles with transporter associations
- **Route CRUD** — Define and manage delivery routes
- **Shipment Management** — Full status workflow from creation to delivery
- **Rule-based Vehicle Assignment** — Automatic vehicle matching for shipments
- **Public Shipment Tracking** — Track shipments by package code (no login required)
- **Driver Panel** — Status updates and location tracking for drivers
- **Reports** — Filtered reports with CSV export

## Demo Credentials

| Role        | Email                         | Password      |
|-------------|-------------------------------|---------------|
| Admin       | admin@translogix.com          | password123   |
| Transporter | transporter@translogix.com    | password123   |
| Driver      | driver@translogix.com         | password123   |
| Customer    | customer@translogix.com       | password123   |

## Getting Started

### Prerequisites

- Node.js 18+
- [pnpm](https://pnpm.io/)
- [Docker](https://www.docker.com/)

### Setup

```bash
# Clone the repository
git clone <repo-url>
cd translogiX

# Start PostgreSQL
docker compose up -d

# Install dependencies
pnpm install

# Copy environment variables (if .env doesn't exist)
cp .env.example .env

# Create database tables
pnpm drizzle-kit push

# Seed demo data
pnpm tsx --env-file=.env scripts/seed.ts

# Start the development server
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

```
app/
  (auth)/login/          — Login page
  (dashboard)/
    admin/               — Admin pages (dashboard, transporters, vehicles, routes, shipments, reports)
    transporter/         — Transporter pages (dashboard, vehicles, shipments)
    driver/              — Driver panel
    customer/            — Customer dashboard
  track/                 — Public shipment tracking
  api/                   — API route handlers
components/
  ui/                    — shadcn/ui components
  layout/                — Sidebar, header
lib/
  db/                    — Drizzle schema, client
  auth/                  — BetterAuth config
  validations/           — Zod schemas
  utils/                 — Utility functions (CSV export)
scripts/                 — Seed script
docker-compose.yml       — PostgreSQL container
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start the development server |
| `pnpm build` | Create a production build |
| `pnpm tsc --noEmit` | Run TypeScript type checking |
| `pnpm next lint` | Run ESLint |
| `pnpm drizzle-kit push` | Push schema changes to the database |
| `pnpm tsx --env-file=.env scripts/seed.ts` | Seed the database with demo data |
| `pnpm drizzle-kit studio` | Open Drizzle Studio for database browsing |

## Shipment Status Workflow

```
CREATED → ASSIGNED → PICKED_UP → IN_TRANSIT → DELIVERED
                                    ↕
                              CANCELLED (from any non-DELIVERED state)
```

## API Security

- All API routes require authentication via session-based auth (BetterAuth).
- `TRANSPORTER` role is scoped to their own vehicles and shipments only.
- **Public endpoints (no auth required):**
  - `GET /api/tracking-updates` — Fetch tracking updates
  - `GET /track/[packageCode]` — Public shipment tracking page
