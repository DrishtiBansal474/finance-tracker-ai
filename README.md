# FinTrack AI

A personal finance dashboard for tracking transactions, monthly budgets, savings goals, and spending insights.

## Features

- Transaction tracking and reports
- Monthly budgets with near-limit and overspending alerts
- Savings goals
- Account registration, login, and password reset
- Strong password requirements and light/dark themes

## Requirements

- Node.js 20 or newer
- MongoDB (local or hosted)

## Run locally

1. Install dependencies:

   ```powershell
   npm install
   ```

2. Create your local environment file:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Set `MONGO_URI` to your MongoDB connection string and set `JWT_SECRET` to a long, random value. Keep `.env` private; it is ignored by Git.

4. Start the frontend and API:

   ```powershell
   npm run dev
   ```

The frontend is served at `http://localhost:5173`; the API listens on `http://localhost:5000`.

To generate a JWT secret, run:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Password reset emails require `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. These settings are optional for other local development.

## Production build

```powershell
npm run build
```

Set `JWT_SECRET`, `MONGO_URI`, and `CLIENT_ORIGIN` in the production environment before starting the API with `npm start`.
