# FinTrack AI

A personal finance dashboard for tracking transactions, monthly budgets, savings goals, and spending insights.

## Features

- Transaction tracking and reports
- Transaction-based monthly summaries, category breakdowns, and money flow
- User-defined income and expense categories; new accounts start with no preset categories
- Customizable starting balance; current balance reflects recorded income and expenses
- Transactions and opening balance persist locally, with signed-in data synced to your account
- Monthly budgets with near-limit and overspending alerts
- Savings goals
- Account registration with email confirmation, login, and password reset with HttpOnly JWT session cookies
- Strong password requirements and light/dark themes

Set your starting balance in **Settings**. Dashboard income, spending, and savings are calculated from your transaction history.

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

Email confirmation and password reset require `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM`. `SMTP_FROM` must be a sender address approved by your email provider. New accounts cannot sign in until they use the verification link sent to their inbox.

Run the session-cookie tests with:

```powershell
npm test
```

## Production build

```powershell
npm run build
```

Set `JWT_SECRET`, `MONGO_URI`, and `CLIENT_ORIGIN` in the production environment, then serve the built frontend and API together:

```powershell
$env:NODE_ENV = "production"
npm start
```
