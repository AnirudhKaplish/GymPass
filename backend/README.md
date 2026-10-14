# GymPass Backend

REST API in Go (Gin + GORM). SQLite by default, PostgreSQL via `DB_DRIVER=postgres`. All times are stored in UTC; each gym has a timezone used for its hourly charts and reminders.

```bash
cp .env.example .env
go build ./... && go test ./...
go run .
```

## Structure

```text
backend/
├── config/        # .env parsing
├── database/      # connect, AutoMigrate, demo seed
├── models/        # User, Owner, Gym, GymPhoto, Plan, Membership, Payment, Session, Notification, OTPLog, request DTOs
├── repository/    # queries and transactions (memberships, payments, sessions, gyms, stats, notifications)
├── services/      # notifications + 10-minute scheduler (expiry, reminders, auto-close)
├── controllers/   # member, owner, payment handlers
├── middleware/    # JWT auth by role, rate limiting
├── routes/        # route table + end-to-end test
├── utils/         # JWT, QR tokens, geo (Haversine)
└── main.go
```

## Environment

| Key | Default | Description |
|---|---|---|
| `PORT` | `8080` | Listen port |
| `JWT_SECRET` | dev placeholder | Signing key. Set a long random value outside DEV_MODE |
| `DEV_MODE` | `false` | `true`: any 6-digit OTP accepted, Razorpay mocked, demo data seeded |
| `SEED_DEMO_DATA` | = `DEV_MODE` | Seed the demo owner and gyms when no owners exist |
| `DB_DRIVER` | `sqlite` | `sqlite` or `postgres` |
| `DB_PATH` | `database/gympass.db` | SQLite file |
| `DATABASE_URL` | | PostgreSQL DSN |
| `OTP_EXPIRY` | `300` | OTP lifetime in seconds |
| `QR_REFRESH_SECONDS` | `60` | QR token lifetime hint |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | mock | Razorpay credentials (UPI apps such as GPay and Paytm appear in checkout) |
| `FIREBASE_PROJECT_ID` | | Verifies member phone-login ID tokens |
| `UPLOAD_DIR` | `uploads` | Gym photos, served at `/uploads` |
| `MAX_SESSION_HOURS` | `6` | A visit not punched out by then is closed automatically |

## Domain rules

* Roles are `user` (phone OTP) and `owner` (email + password). Every owner route is scoped to gyms the owner registered; another owner's gym returns 404.
* A plan belongs to a gym. Hourly plans: `price` is per hour, `validity_days` 0 means the hours never expire. Other plans: `price` is the full price for `validity_days`.
* Memberships copy the plan name and type when bought. Buying the same kind again at the same gym extends the existing membership.
* QR: signed token bound to the member, single use, 60 s. The owner's scanner decides the gym. First scan checks in (a date-based membership is preferred over prepaid hours), second scan checks out.
* Prepaid hours are billed by actual seconds inside (minimum 60 s, capped at the balance), across any number of days.
* Cash requests are pending payments (`method=cash`); the owner approves or rejects them.
* Scheduler: expires memberships, auto-closes stale visits, creates reminders (3 d / 1 d, 2 h / 30 min). A unique `(membership_id, kind)` index makes each reminder fire once.

## Endpoints

Public
* `POST /api/auth/send-otp`, `POST /api/auth/verify-otp` (rate limited)
* `POST /api/owner/register`, `POST /api/owner/login` (rate limited)

Member (`Authorization: Bearer <user token>`)
* `POST /api/user/onboard`
* `GET /api/user/dashboard` memberships, pending requests, active visit, recent visits
* `GET /api/user/qr`
* `GET /api/user/gyms?lat=&lng=&q=&radius_km=&limit=` nearest first when lat/lng are given
* `GET /api/user/gyms/:id`
* `POST /api/user/payments/initiate`, `POST /api/user/payments/verify`
* `POST /api/user/memberships/cash-request`, `POST /api/user/requests/:id/cancel`
* `GET /api/user/notifications`, `POST /api/user/notifications/read`

Owner (`Authorization: Bearer <owner token>`)
* `GET /api/owner/me`
* `GET|POST /api/owner/gyms`, `GET|PUT /api/owner/gyms/:id`
* `POST /api/owner/gyms/:id/photos` (multipart field `photos`, max 10 per gym, 5 MB each, JPG/PNG/WebP), `DELETE /api/owner/gyms/:id/photos/:photoId`
* `GET|POST /api/owner/gyms/:id/plans`, `PUT|DELETE /api/owner/plans/:planId`
* `GET /api/owner/gyms/:id/dashboard|members|sessions|payments|requests`
* `POST /api/owner/requests/:id/approve|reject`
* `POST /api/owner/gyms/:id/scan` body `{ "token": "GP-..." }`

## Database

AutoMigrate runs on start. Foreign keys are not enforced by the database; relations are loaded explicitly. To reset local data, stop the server, delete `database/gympass.db` and restart (the schema changed from earlier versions, so delete the old file once). Switch to PostgreSQL by setting `DB_DRIVER=postgres` and `DATABASE_URL`.
