# Going live

This guide takes GymPass from "works on my laptop" to a real site with real SMS login and real payments.

## 1. Firebase phone login (members)

1. In the [Firebase console](https://console.firebase.google.com) open your project, then **Authentication > Sign-in method** and enable **Phone**.
2. **Authentication > Settings > Authorized domains**: add every domain the site is served from (your production domain, and any tunnel or LAN address you test on). `localhost` is there by default.
3. While testing, add fake numbers under **Phone > Phone numbers for testing** (for example `+91 98765 00000` with code `123456`) so you do not burn SMS quota.
4. Real SMS to Indian numbers needs the **Blaze** (pay-as-you-go) plan and a region policy that allows India.
5. Put the web config values in the frontend env (below). The backend only needs `FIREBASE_PROJECT_ID`; it checks the sign-in token against Google's public keys, no service-account file is needed.

## 2. Razorpay (GPay, Paytm, PhonePe, cards)

1. Create a Razorpay account, complete KYC and switch to **Live mode**.
2. Copy the Live **Key ID** and **Key Secret** into `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`. Any value other than `rzp_test_mock_id_123` turns off the built-in payment simulator.
3. All online payments land in this single Razorpay account. Paying each gym directly would need Razorpay Route, which GymPass does not include yet.

## 3. Environment

`backend/.env` for production:

```env
PORT=8080
DEV_MODE=false
JWT_SECRET=<long random string, for example from: openssl rand -hex 32>
DB_DRIVER=postgres
DATABASE_URL=host=... port=5432 user=... password=... dbname=... sslmode=require
RAZORPAY_KEY_ID=rzp_live_...
RAZORPAY_KEY_SECRET=...
FIREBASE_PROJECT_ID=your-project-id
UPLOAD_DIR=/app/uploads
MAX_SESSION_HOURS=6
SEED_DEMO_DATA=false
```

Frontend build values (`frontend/.env.local`, or build arguments in your host):

```env
NEXT_PUBLIC_API_URL=https://api.yourdomain.com/api
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
```

These are baked into the site when it is built, so rebuild after changing them.

## 4. Run it

**Docker (one machine or VPS)**

```bash
cp backend/.env.example backend/.env      # then edit as above
# root .env with the NEXT_PUBLIC_* values for the frontend build
docker compose up -d --build
```

This starts Postgres, the API on port 8080 and the site on port 3000. Photos live in the `uploads_data` volume and the database in `postgres_data`: back both up.

**Without Docker**

* Backend: `cd backend && go build -o gympass . && ./gympass`
* Frontend: `cd frontend && npm ci && npm run build && npm start`
* Hosting split that works well: frontend on Vercel, backend on a small VPS or any host that gives it a persistent disk (for uploads) and Postgres.

## 5. HTTPS

The site and the API must both be served over HTTPS. Phones only allow location and camera on HTTPS pages, and the "install as app" feature needs it too. Put Caddy, Nginx or your host's built-in TLS in front of ports 3000 and 8080 (a Caddy file with two `reverse_proxy` lines is enough).

## 6. Before the first real member

* Register your real owner account at `/owner/register`. Demo data is off when `SEED_DEMO_DATA=false`.
* Do a Razorpay test purchase with a small plan and refund it.
* Check that a phone outside your test list receives the SMS.
* Confirm a scan with a real phone camera: the owner's Scan page uses the browser's QR reader (Chrome and Edge on Android and desktop; on iPhone Safari use the paste box or a separate QR scanner app).

## Known limits

* No password reset for owners yet.
* Notifications are in-app only. Push or SMS reminders would plug into `services.SendNotification`.
* CORS currently allows any origin; restrict it to your domain in `backend/routes/routes.go` once you have one.
