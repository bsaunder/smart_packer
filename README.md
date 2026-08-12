# Smart Packing Planner

Smart Packing List Generator. See [DESIGN.md](./DESIGN.md) for the full design and requirements document.

## Getting Started

Requires Node 22+, pnpm, and Docker (for PostgreSQL). `pnpm dev` only starts the Next.js dev server — it does **not** start Postgres, so the app will fail to load any page until a database is running and migrated.

### 1. Configure environment variables

```bash
cp .env.example .env
```

The defaults in `.env.example` already match the Postgres credentials in `docker-compose.yml`, so no edits are required for local development.

### 2. Start Postgres

```bash
docker compose up -d db
```

This starts only the database container (not the app), on `localhost:5432`, with a persistent named volume so your data survives restarts. Leave it running in the background — `docker compose down` stops and removes the container (data is preserved in the volume); `docker compose ps` shows whether it's up.

### 3. Install dependencies, migrate, and seed

```bash
pnpm install
pnpm db:migrate       # applies prisma/migrations against the running db
pnpm db:seed          # creates the ADMIN_USERNAME/ADMIN_PASSWORD dev user from .env
```

`db:seed` creates the initial admin account — both the `User` row and its Better Auth credential — from `ADMIN_USERNAME`/`ADMIN_PASSWORD` in `.env` (defaults: `admin` / `change-me`). It's a first-run bootstrap: it no-ops once any user exists, so re-running it is always safe.

### 4. Run the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with the `ADMIN_USERNAME`/`ADMIN_PASSWORD` from `.env`. Steps 2–3 only need to be repeated when you reset the database; day-to-day you just need `docker compose up -d db` running and `pnpm dev`.

There's no self-service signup — accounts are admin-created. The seeded admin can create further users (and deactivate/reactivate users, or reset anyone's password) from **Admin** in the nav, at `/admin/users`.

### Alternative: run the whole stack in Docker (production / self-hosted deployment)

```bash
cp .env.example .env   # edit AUTH_SECRET / ADMIN_PASSWORD first
docker compose up -d
```

This is the deployment path — a compose file, no host `pnpm`/Node/Prisma CLI required, no separate migrate/seed commands to run by hand. It starts three services:

- **`db`** — PostgreSQL with a persistent named volume.
- **`migrate`** — a one-shot container that applies pending Prisma migrations and seeds the initial admin user (only if no users exist yet), then exits. Runs automatically before `app` starts, including on every future `docker compose up` after a `git pull` that adds new migrations — upgrades are just "pull, then `docker compose up -d --build` again."
- **`app`** — the persistent Next.js server. Waits for `migrate` to finish successfully first.

`AUTH_SECRET` and `ADMIN_PASSWORD` are required — `docker compose up` fails fast with a clear error if they're not set in `.env`. `docker compose logs migrate` shows what the migration/seed step did on the most recent startup.

Note on image size: the `migrate` image is intentionally larger than `app` (it bundles the full Prisma CLI, which pulls in Prisma Studio and other tooling the app itself never uses) — this is fine since it only runs briefly and exits; it's not part of the app's continuous runtime footprint. `app`'s image stays small (Next.js standalone output, no Prisma CLI) since that's the one actually running all the time. See DESIGN.md's Deployment section for the full rationale.

Built with [Next.js](https://nextjs.org) (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma, and PostgreSQL. See DESIGN.md for the full architecture.

## CSV Import & Export

Master data — Categories, Items (including parent/child relationships and default quantities), and Modules (including membership) — can be imported and exported as a single CSV file from **Settings**. Trips, Trip Items, and Bags are never part of this file; they're runtime data generated from master data, not migrated directly.

Two ready-to-use example files:

- [samples/items-sample.csv](./samples/items-sample.csv) — a small (21-item) example covering every column, good for reading alongside this doc.
- [samples/items-test-data.csv](./samples/items-test-data.csv) — 155 items across 13 categories and 16 modules, for exercising the app with a realistic-sized catalog. Includes a shared child across two parents (Z-330 Strobe under two different camera bodies) and a two-level parent/child chain (OM-D E-M1 Mk II → Battery Charger → Charging Cable) to test recursive expansion. A few items are marked `active=false`, and one note contains a comma (quoted per RFC 4180) to exercise that on both import and export.

Download either from Settings to try import, or use one as-is to seed a fresh database.

### File format

- UTF-8, comma-delimited, RFC 4180 quoting (a field containing a comma, quote, or newline is wrapped in double quotes).
- A header row is required; column order doesn't matter (columns are matched by name, case-insensitive).
- Multi-value cells (`modules`, `children`) use `|` as the separator, e.g. `Flight|Cruise|World Cup`.

### Columns

| Column | Required | Description |
|---|---|---|
| `name` | Yes | The Item's name. Unique per user — this is the upsert key and what `children` references resolve against. |
| `category` | Yes | Category name. Created automatically if it doesn't exist yet. |
| `default_quantity` | No | Positive integer. Defaults to `1`. |
| `notes` | No | Free-text notes. |
| `active` | No | `true` / `false`. Defaults to `true`. |
| `modules` | No | Pipe-delimited Module names this Item belongs to. Modules are created automatically. |
| `children` | No | Pipe-delimited **Item names** that are children of this Item (parent → children). Each name must match either another row's `name` in this file or an Item that already exists in your database — a reference to neither is a validation error. |

### Import semantics

- **Upsert by name.** Re-importing is safe and additive: an existing Item's scalar fields are updated, and its module memberships and children are **merged** (union), never replaced or removed.
- **Validated before anything is written.** The whole file is checked first — missing `name`/`category`, a non-positive `default_quantity`, an item listed as its own child, an unresolved child reference, or a parent/child **cycle** (checked against the file *and* your existing data) — and the import is rejected as a whole if any row fails. You'll see a row-by-row error list and a create/update summary before confirming.
- **Module-child invariant.** If a parent belongs to a Module, its children are ensured to belong to that Module too, even across multi-level chains.

### Export

Downloads the exact same shape for every Item you own (active and inactive). Round-tripping is lossless: exporting and immediately re-importing the same file validates cleanly and updates everything in place with no new rows.
