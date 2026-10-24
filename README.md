# LifeFlow — MERN Blood Donation Platform

A MERN starter for a role-based blood donation platform using React, Express, MongoDB/Mongoose, Socket.IO, JWT cookies, and Framer Motion.

## Run locally
1. Install Node.js 20+ and run MongoDB.
2. Copy `server/.env.example` to `server/.env`.
3. For optional email features, configure Gmail SMTP with a Google App Password in `server/.env`. No paid SMS or OTP provider is used.
4. Backend:
   ```bash
   cd server
   npm install
   npm run dev
   ```
5. Frontend:
   ```bash
   cd client
   npm install
   npm run dev
   ```
6. Open `http://localhost:5173`.

## Authentication behaviour
- Registration and login work without OTP.
- Email verification is optional and can be requested from the profile workflow/API.
- Forgot-password uses a six-digit email OTP that expires in 5 minutes.
- OTPs are hashed in MongoDB, expire automatically, have an attempt limit, and requests are throttled.
- No mobile OTP or SMS gateway is included.

## API endpoints
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password` — body `{ "email": "..." }`
- `POST /api/auth/reset-password` — body `{ "email": "...", "otp": "123456", "password": "new-long-password" }`
- `POST /api/auth/send-verification-otp` — authenticated
- `POST /api/auth/verify-email` — authenticated, body `{ "otp": "123456" }`

## Important
This is a runnable starter foundation, not a certified emergency dispatch service. Before production, add refresh-token rotation/revocation, CSRF protection appropriate to deployment, full role authorization tests, audit logs, provider configuration, email deliverability checks, backups, monitoring, formal privacy/legal review, and end-to-end tests. Blood compatibility is a simplified red-cell reference; clinical decisions require qualified professionals and blood-bank crossmatching. Sample dashboard figures are not live operational statistics.
