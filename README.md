BookTimez backend (MVP)

Quick start

1. Copy `.env.example` -> `.env` and set `DATABASE_URL` and `JWT_SECRET`.
2. Install

```bash
cd booktimez-app
npm install
```

3. Run seed + start

```bash
npm run seed
npm start
```

Server listens on `PORT` (default 4000). The server uses Sequelize `sync()` for quick local setup. For production, replace with proper migrations.

APIs

- `POST /api/auth/register` {email,password}
- `POST /api/auth/login` {email,password}
- `POST /api/auth/google` {email,googleId,name}
- `POST /api/auth/forgot-password` {email}
- `POST /api/auth/reset-password` {token,newPassword}
- `POST /api/business` (auth)
- `POST /api/business/:businessId/services` (auth)
- `GET /api/public/:slug/services`
- `GET /api/public/:slug/services/:serviceId/availability?start=YYYY-MM-DD&end=YYYY-MM-DD`
- `POST /api/public/:slug/appointments`

Notes

- Timezone-aware slot generation uses business timezone stored on `Business.timezone`.
- Localization files are in `src/locales/{en,hi,ar}.json`.

Sharing the public booking link

- Each business gets a `slug` used in public booking URLs: `https://APP_BASE_URL/b/:slug`.
- When a business is created (via `POST /api/business`), the API returns a `publicLink` field in the response; share this link with customers.
- You can control the base URL by setting `APP_BASE_URL` in the environment (see `.env.example`).
- Public endpoints used by booking pages:
  - `GET /api/public/:slug/services` — list services
  - `GET /api/public/:slug/services/:serviceId/availability?start=YYYY-MM-DD&end=YYYY-MM-DD` — available slots
  - `POST /api/public/:slug/appointments` — create booking
# booktimes-app
# booktimes-app
