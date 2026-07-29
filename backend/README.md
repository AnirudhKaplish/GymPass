# GymPass Backend Core

GymPass backend is a high-performance REST API built in Go (Gin Framework) utilizing GORM for database operations. It supports dynamic driver abstraction, soft deletes, connection pooling, prepared statements, and transactional safety.

By default, the application runs on **SQLite** for local developer setups (requiring no PostgreSQL or Docker runtimes).

---

## Project Architecture & Folder Structure

```text
backend/
├── config/
│   └── config.go         # Parses .env and centralizes app configuration
├── database/
│   ├── Connect.go        # Database driver connection & pool initialization
│   ├── migrate.go        # Schema AutoMigrate definition
│   └── seed.go           # dynamic seeding (admin, settings, plans)
├── models/
│   ├── admin.go          # Admin model
│   ├── user.go           # User model
│   ├── plan.go           # Access Plan model
│   ├── subscription.go   # Subscriptions (Purchase struct) model
│   ├── payment.go        # Payments model
│   ├── session.go        # Sessions check-in model
│   ├── otp.go            # OTPCode logs model
│   ├── settings.go       # Gym Settings model
│   └── requests.go       # Bind DTO request structures
├── repository/
│   └── database.go       # Repository CRUD and transaction interfaces
├── controllers/          # Gin Controller endpoints
├── routes/               # Gin Route registration
└── main.go               # Application entry point
```

---

## Environment Variables (.env)

Configure these keys in `backend/.env`:

| Key | Default Value | Description |
|---|---|---|
| `PORT` | `8080` | Server listening port |
| `JWT_SECRET` | `super_secret_jwt_key` | Secret key for JWT signatures |
| `DB_DRIVER` | `sqlite` | Database driver: `sqlite` or `postgres` |
| `DB_PATH` | `database/gympass.db` | Path where the SQLite DB is stored |
| `DATABASE_URL` | `host=...` | PostgreSQL connection string (if driver is postgres) |
| `ADMIN_EMAIL` | `admin@gympass.com` | Email seeded on first run |
| `ADMIN_PASSWORD` | `admin123` | Password seeded on first run |
| `ADMIN_PHONE` | `9876543210` | Phone number seeded on first run |
| `OTP_EXPIRY` | `300` | Code expiration time in seconds (5 mins) |
| `QR_REFRESH_SECONDS`| `60` | QR code expiry interval |
| `DEV_MODE` | `true` | Enables mock OTP returns and logging |

---

## Database Operational Guides

### 1. Auto-Migration & Seed
On startup, GORM automatically creates the SQLite database file (`backend/database/gympass.db`) if it doesn't exist, runs GORM `AutoMigrate()`, and checks if tables are empty. If they are, it seeds:
- An admin account with email and phone parsed from the `.env` (hashed using bcrypt).
- Default settings for "GymPass Prime".
- Default plans (Hourly Pack, Monthly Membership, Quarterly, Yearly).

### 2. Resetting the Database
To clear all data and reset the database:
1. Stop the backend server.
2. Delete the database file:
   ```bash
   rm backend/database/gympass.db
   ```
3. Restart the server. The schema will be recreated and re-seeded automatically.

### 3. Switching to PostgreSQL later
Because database queries are abstracted using GORM rather than raw SQL, you can switch back to PostgreSQL at any time without changing any code:
1. Update `backend/.env`:
   ```env
   DB_DRIVER=postgres
   DATABASE_URL=postgres://user:password@localhost:5432/dbname?sslmode=disable
   ```
2. Restart the application. GORM will load the Postgres driver, auto-migrate, and seed the tables.
