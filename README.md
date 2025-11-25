# RailPulse

Monitor Swedish train delays and get real-time notifications. Track your favorite train routes, receive alerts for delays and disruptions, and stay informed about Swedish rail traffic.

## Features

- **Real-time Train Monitoring** - Track train delays and disruptions from Trafikverket's API
- **Custom Route Alerts** - Set up notifications for specific train routes and stations
- **Multi-channel Notifications** - Receive alerts via email (SMTP support)
- **User Management** - Role-based access with admin controls and secure authentication
- **Password Reset System** - Self-service or admin-assisted password recovery
- **RESTful API** - Complete API for integration with other tools
- **Responsive Interface** - Modern Vue 3 frontend with dark mode support

## Tech Stack

- **Backend**: Node.js, Express, Prisma ORM, SQLite
- **Frontend**: Vue 3, Vite, Pinia, Tailwind CSS
- **Deployment**: Docker & Docker Compose
- **Data Source**: Trafikverket Open API

## Quick Start

### Docker Compose (Recommended)

1. Use the included `docker-compose.yml` (or copy this snippet if you're not in the repo) and set your values:

```yaml
services:
  railpulse:
    image: ghcr.io/secunit404/railpulse:latest
    container_name: railpulse
    environment:
      - DATABASE_URL=file:./data/railpulse.db
      - JWT_SECRET=your-secret-key-change-me
      - TRAFIKVERKET_API_KEY=your-api-key-here
      - FRONTEND_URL=http://localhost:9876
      - PORT=9876
      - TZ=Europe/Stockholm
      # Optional: Enable email notifications
      # - SMTP_HOST=smtp.example.com
      # - SMTP_PORT=465
      # - SMTP_USER=your-smtp-user
      # - SMTP_PASS=your-smtp-password
      # - SMTP_FROM="RailPulse <no-reply@example.com>"
    volumes:
      - ./data:/app/data  # Database and persistent data
    ports:
      - "9876:9876"
    restart: unless-stopped
    user: "1000:1000"  # Adjust PUID:PGID as needed
```

2. Get your Trafikverket API key from [https://api.trafikinfo.trafikverket.se/](https://api.trafikinfo.trafikverket.se/)

3. Update the environment variables in the compose file (especially `JWT_SECRET` and `TRAFIKVERKET_API_KEY`)

4. Start the container:
```bash
docker compose up -d
```

5. Access the application at [http://localhost:9876](http://localhost:9876)

⚠️ **Note**: Make sure to change `JWT_SECRET` to a secure random string before deploying to production. The first account you register becomes the admin; additional users will need an invite code.

### Docker Run

Alternatively, run with `docker run`:

```bash
docker run -d \
  --name railpulse \
  -p 9876:9876 \
  -e JWT_SECRET=your-secret-key \
  -e TRAFIKVERKET_API_KEY=your-api-key \
  -e FRONTEND_URL=http://localhost:9876 \
  -v ./data:/app/data \
  ghcr.io/secunit404/railpulse:latest
```

### Using Environment File

For easier configuration management:

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Edit `.env` and set your values:
```env
JWT_SECRET=change-me-to-something-secure
TRAFIKVERKET_API_KEY=your-api-key
FRONTEND_URL=http://localhost:9876
PORT=9876
TZ=Europe/Stockholm

# Optional: SMTP for email notifications
# SMTP_HOST=smtp.example.com
# SMTP_PORT=465
# SMTP_USER=your-username
# SMTP_PASS=your-password
# SMTP_FROM="RailPulse <no-reply@example.com>"
```

3. Start with Docker Compose:
```bash
docker compose up -d
```

Migrations are applied automatically on container start.

## Development

Prereqs: Docker + Docker Compose, Node 20 (via nvm), npm.

```bash
# First time setup
cp .env.example .env
# Edit .env and add TRAFIKVERKET_API_KEY, JWT_SECRET, FRONTEND_URL, and SMTP settings
nvm install 20
nvm use 20

# Install deps for backend/frontend
npm run bootstrap

# Make Prisma see your single root .env (symlink once). Remove backend/prisma/.env first if it already exists.
ln -s ../../.env backend/prisma/.env

# Apply database schema locally (creates SQLite db at ./data/railpulse.db)
npm run migrate

# Start dev servers (backend + frontend, with prefixed logs)
npm run dev
```

Open http://localhost:5173

Stop with Ctrl+C

## Configuration

### Required Environment Variables

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Secret key for JWT token generation (change to a secure random string) |
| `TRAFIKVERKET_API_KEY` | API key from [Trafikverket](https://api.trafikinfo.trafikverket.se/) |
| `FRONTEND_URL` | Base URL for the application (used in password reset links) |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `9876` |
| `DATABASE_URL` | SQLite database path | `file:./data/railpulse.db` |
| `TZ` | Timezone for the application | `Europe/Stockholm` |
| `LOG_LEVEL` | Logging verbosity (error, warn, info, debug) | `info` |
| `PUID` | User ID for file permissions | `1000` |
| `PGID` | Group ID for file permissions | `1000` |
| `DATA_DIR` | Data directory path (for development) | `./data` |

Use `FRONTEND_URL=http://localhost:9876` when the bundled frontend is served by the container, and `FRONTEND_URL=http://localhost:5173` when running the Vite dev server (the default in `.env.example`).

### SMTP Configuration (Optional)

For email notifications and password reset functionality:

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | SMTP server hostname | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP server port | `465` |
| `SMTP_USER` | SMTP username | `your-email@gmail.com` |
| `SMTP_PASS` | SMTP password | `your-app-password` |
| `SMTP_FROM` | From address for emails | `"RailPulse <no-reply@example.com>"` |

### Admin password resets without SMTP
- Admins can generate a reset token/link without SMTP via `POST /api/auth/admin/reset-password` (requires an authenticated admin session).
- Body: `{ "email": "user@example.com", "sendEmail": false }` (omit `sendEmail` to keep it manual; set `true` if SMTP is configured and you still want an email sent).
- Response includes `resetLink` and `resetToken`; share the link with the user to complete the reset.
- Make sure `FRONTEND_URL` is set so links point to your frontend domain.

## Data Persistence

All application data is stored in the `/app/data` directory inside the container. Make sure to mount this as a volume to persist:

- SQLite database
- Application logs
- User configurations

```yaml
volumes:
  - ./data:/app/data  # Mount host ./data directory to container /app/data
```

⚠️ **Important**: The container runs as user `1000:1000` by default. Ensure your `./data` directory has appropriate permissions, or adjust `PUID` and `PGID` environment variables to match your host user.

## Updates

Docker images are automatically built and published to GitHub Container Registry on every push to main and on version tags.

To update to the latest version:

```bash
docker compose pull
docker compose up -d
```

To use a specific version:

```yaml
services:
  railpulse:
    image: ghcr.io/secunit404/railpulse:v1.0.0  # Use specific version tag
```

## Building from Source

If you want to build the Docker image locally instead of using pre-built images:

1. Clone the repository:
```bash
git clone https://github.com/secunit404/railpulse.git
cd railpulse
```

2. Build and start with Docker Compose:
```bash
docker compose up -d --build
```

Or modify your `docker-compose.yml` to build from source:

```yaml
services:
  railpulse:
    build:
      context: .
      dockerfile: Dockerfile
    # ... rest of configuration
```

## Troubleshooting

### Container Won't Start

Check container logs:

```bash
docker compose logs -f railpulse
```

Common issues:
- **Missing environment variables**: Ensure `JWT_SECRET` and `TRAFIKVERKET_API_KEY` are set
- **Permission denied on /app/data**: Check that PUID/PGID match your host user or adjust permissions on the `./data` directory
- **API key invalid**: Verify your Trafikverket API key is active at [https://api.trafikinfo.trafikverket.se/](https://api.trafikinfo.trafikverket.se/)

### Development Server Port Conflicts

For development mode (frontend on 5173, backend on 9876):

```bash
# Kill processes on development ports
lsof -ti :5173 :9876 | xargs kill -9
```

## License

MIT
