# Copilot / AI Agent Instructions — BookTimez (backend)

Purpose

- Short: help AI coding agents be immediately productive in the `booktimez-app` backend.

Where to start

- Backend root: `booktimez-app/`.
- Key folders: `src/models/`, `src/controllers/`, `src/services/`, `src/config/`, `migrations/`, `seeders/`.
- Frontend lives in `booktimez-ui/` (public booking pages + owner dashboard).

High-level architecture notes (important)

- Backend: Node.js + Express + Sequelize (Postgres). All PKs are UUIDs.
- Times: appointments stored as UTC (`timestamptz`). Business-local times are stored as `HH:mm` strings in `Availability` and converted to UTC when generating slots.
- Business timezone: primary source for availability and notification scheduling — stored on `Business.timezone` (IANA, e.g. `Asia/Kolkata`).
- Slot generation lives in `src/services/slotGenerator.js` (canonical algorithm) — modify here when changing availability logic.
- Booking flow/transaction: `src/controllers/appointment.js` — must perform DB transaction + overlap checks (use Postgres exclusion constraint or `SELECT FOR UPDATE` lock pattern).

Project-specific conventions

- UUID primary keys everywhere: models use `Sequelize.UUID` with `gen_random_uuid()` or `uuid_generate_v4()`.
- Weekly availability rules are stored in `Availability` with `weekday`, `startTime`, `endTime` (local to business tz). Do not change representation without updating migrations and slot generator.
- Use `planEnforcer` service (`src/services/planEnforcer.js`) to gate features (service count, monthly booking limits, language access, branding removal). Call it from controllers that create services or appointments.
- Email templates are localized under `src/locales/email/{en,hi,ar}/`. Use `Business.language` to select template.
- Public booking endpoints use the business `slug` (public URL): `/api/public/:slug/...` — prefer `slug` over numeric id for public pages.

Important files to reference

- `src/models/appointment.js` — appointment schema and DB-level constraints
- `src/models/service.js` and `src/models/availability.js` — service durations and weekly rules
- `src/services/slotGenerator.js` — slot candidate generation algorithm
- `src/services/planEnforcer.js` — plan gating functions
- `src/controllers/appointment.js` — transactional booking logic (conflict prevention)
- `src/config/passport.js` — Google OAuth setup and token handling
- `migrations/*` — examples of creating extensions (`pgcrypto`, `btree_gist`) and exclusion constraints

Dev workflows & commands

- Set up `.env` from `.env.example`. Minimum env keys:
  - `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `SMTP_URL`, `REDIS_URL` (if used).
- Install & run locally:
  ```bash
  cd booktimez-app
  npm install
  npx sequelize-cli db:migrate
  npx sequelize-cli db:seed:all
  npm run dev
  ```
- Run tests:
  ```bash
  npm test
  ```
- If using Docker/compose, look for `docker/` for examples and startup scripts.

Timezone & i18n guidance

- Use `luxon` or `date-fns-tz` for timezone conversions. Always convert business-local datetimes to UTC before DB comparisons.
- For email and public page language selection: prefer `Business.language`, but fall back to `en`.
- Frontend must handle RTL when language `ar` is served for a business (UI-only requirement).

Booking concurrency rules (must follow)

- Prefer Postgres exclusion constraint on a generated `tsrange` column to prevent overlapping appointments. See migrations for sample SQL:
  - `CREATE EXTENSION IF NOT EXISTS btree_gist;` and an `EXCLUDE USING gist (businessId WITH =, period WITH &&)` constraint.
- If not using exclusion constraint, implement transactional locking: lock a calendar row keyed by date (`SELECT * FROM calendar_lock WHERE business_id=? AND day=? FOR UPDATE`) then check overlapping rows and insert.

Plan & billing notes

- Plans stored in `Plan` model. Controllers must call `planEnforcer` prior to creating resources.
- Enforced limits (examples): `maxServices`, `maxBookingsPerMonth`, `languages` allowed. Return 403/402-style error with clear reason when blocked.

What to preserve when editing

- Keep semantics of `Availability` (weekday + HH:mm). If changing, update `slotGenerator`, migrations, and samples.
- Do not change the timezone canonicalization approach (business tz -> UTC storage) without migration plan.

When creating PRs for this repo (AI agent rules)

- Limit changes in a single PR to related files (model + migration + service) when changing schema.
- Add/adjust a Sequelize migration when modifying models; include DB extension setup if using `tsrange`/exclusion constraints.
- Include unit tests for `slotGenerator` and integration tests for booking flow (conflict scenarios).

If you find an existing `.github/copilot-instructions.md` elsewhere, merge by:

- Preserving any project-specific notes (CI, secrets, custom scripts).
- Keep the UUID/timezone/availability conventions unchanged unless there's a coordinated migration.

Contact/owner notes

- Primary backend code owner: look for `package.json` `author` or recent committers.

If anything is unclear, open a concise issue or ask the repo owner before proposing migration-level changes.
