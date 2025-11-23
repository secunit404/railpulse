# RailPulse

Monitor Swedish train delays and get notifications.

## Tech Stack
- Backend: Node.js, Express, Prisma, SQLite
- Frontend: Vue 3, Vite, Pinia, Tailwind
- Deploy: Docker

## Quick Start (Docker)

1. Copy envs: `cp .env.example .env` and set `TRAFIKVERKET_API_KEY`, `JWT_SECRET`, `FRONTEND_URL` (add SMTP settings if you want emails).
2. Set the Docker image you want to use by editing `docker-compose.yml` or exporting `IMAGE=ghcr.io/OWNER/REPO:latest`.
3. Start: `docker compose pull && docker compose up -d` (or `docker compose up -d --build` if you want to build locally).
4. Open http://localhost:9876 (backend serves the built frontend).

Migrations are applied automatically on container start.

## Development

```bash
# First time setup
cp .env.example .env
# Edit .env and add TRAFIKVERKET_API_KEY, JWT_SECRET, FRONTEND_URL, and SMTP settings
nvm use 20

# Install deps for backend/frontend
npm run bootstrap

# Make Prisma see your single root .env (symlink once):
ln -s ../../.env backend/prisma/.env

# Apply database schema locally (creates SQLite db at ./data/railpulse.db)
npm run migrate

# Start dev servers (backend + frontend, with prefixed logs)
npm run dev
```

Open http://localhost:5173

Stop with Ctrl+C

## Environment Variables

Required:
- `DATABASE_URL` - SQLite path (default: file:./data/railpulse.db). Container uses /app/data (mounted volume).
- `JWT_SECRET` - Secret for JWT tokens
- `TRAFIKVERKET_API_KEY` - Get from https://api.trafikinfo.trafikverket.se/
- `FRONTEND_URL` - Base URL used for password reset links (e.g., http://localhost:5173 or https://app.example.com)
  - Also used for admin-generated reset links when SMTP is disabled

Optional:
- `PORT` - Server port (default: 9876)
- `TZ` - Timezone (default: Europe/Stockholm)
- `LOG_LEVEL` - Logging level (default: info)
- `PUID/PGID` - User/group IDs (default: 1000)
- `DATA_DIR` - Data directory (default: ./data)
- SMTP (for password reset emails):
  - `SMTP_HOST` (e.g., smtp.smtp2go.com)
  - `SMTP_PORT` (e.g., 465)
  - `SMTP_USER`
  - `SMTP_PASS`
  - `SMTP_FROM` (e.g., "RailPulse <no-reply@example.com>")

### Admin password resets without SMTP
- Admins can generate a reset token/link without SMTP via `POST /api/auth/admin/reset-password` (requires an authenticated admin session).
- Body: `{ "email": "user@example.com", "sendEmail": false }` (omit `sendEmail` to keep it manual; set `true` if SMTP is configured and you still want an email sent).
- Response includes `resetLink` and `resetToken`; share the link with the user to complete the reset.
- Make sure `FRONTEND_URL` is set so links point to your frontend domain.

## Building from Source

Only needed if modifying code:

```bash
docker-compose -f docker-compose.yml build
docker-compose -f docker-compose.yml up
```

## Updates

Docker images are automatically built on every push to main and version tags.

Pull latest:
```bash
docker-compose pull
docker-compose up -d
```

## Troubleshooting

Port conflicts:
```bash
lsof -ti :5173 :9876 | xargs kill -9
```

Database issues:
```bash
rm -rf data/tgbot.db
docker-compose restart
```
