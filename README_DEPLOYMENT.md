# Request Management System

Node.js application for internal request management with Talknote integration.

## Requirements

- Node.js >= 14.0.0
- npm >= 6.0.0

## Installation

```bash
npm install
```

## Running

```bash
npm start
```

Server will start on port 8080 (or PORT environment variable).

## Environment Variables

Required:
- `NODE_ENV=production`
- `SESSION_SECRET=<random-secret>`
- `TALKNOTE_CLIENT_ID=<from-talknote>`
- `TALKNOTE_CLIENT_SECRET=<from-talknote>`
- `TALKNOTE_REDIRECT_URI=<your-domain>/api/callback`

## Architecture

This is a **Node.js Express application**, not a static site.

### Important Files
- `server.js` - Main application server (MUST RUN)
- `package.json` - Dependencies and scripts
- `public/` - Static assets (served by Express)

### Deployment

This application MUST be deployed as a **Node.js application**, not as a static site hosting.

#### For Platform Configuration:
- Type: **Node.js Application** or **Backend Service**
- Build Command: `npm install`
- Start Command: `npm start` or `node server.js`
- Port: 8080

## API Endpoints

- `GET /health` - Health check
- `GET /` - Main page
- `GET /app` - Application login
- `GET /dashboard` - Dashboard (requires auth)
- `POST /api/requests` - Create request
- ... (see server.js for full list)

## Troubleshooting

If you see "Server Not Running" error:
1. Check that Node.js server is started with `npm start`
2. Verify deployment is configured as "Node.js Application"
3. Check server logs for startup messages

For more details, see `STATIC_MODE_DIAGNOSIS.md`.
