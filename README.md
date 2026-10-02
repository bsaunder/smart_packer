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

### Deploying with prebuilt images (Dockge, Portainer, any remote host)

`docker-compose.yml` builds from source, so it only works where the repo is checked out. For a server where you'd rather just paste a compose file (e.g. a [Dockge](https://github.com/louislam/dockge) stack), use **`docker-compose.prod.yml`** instead: it's the same three services, but it pulls prebuilt images from GitHub Container Registry, and it doesn't publish Postgres's port to the host.

The images are built and pushed by [.github/workflows/docker-publish.yml](./.github/workflows/docker-publish.yml) on every push to `main` (and on `v*` tags):

| Image | Dockerfile target | Tags |
|---|---|---|
| `ghcr.io/bsaunder/smart_packer` | `app` | `latest`, `sha-<short>`; `1.2.3` + `1.2` on a `v1.2.3` tag |
| `ghcr.io/bsaunder/smart_packer-migrate` | `migrate` | same |

The images are built for `linux/amd64` only. For an ARM host, see the `platforms` comment in the workflow.

#### One-time setup

1. **Publish the first images.** Push to `main`, or run the workflow by hand: GitHub → **Actions** → *Publish Docker images* → **Run workflow**. When it finishes, both packages appear under your GitHub profile → **Packages**.
2. **Make sure both packages are public.** GHCR can create a new package as private even when the repo is public. Open each package from your profile's **Packages** tab and check its visibility. If it says Private, go to **Package settings** → **Change visibility** → Public. You only need to do this once per package, and after that the server can pull without logging in.

   (If you ever take the repo or packages private again, the server has to log in to pull. Create a [personal access token (classic)](https://github.com/settings/tokens) with only the `read:packages` scope, then run `docker exec -it dockge docker login ghcr.io -u bsaunder` and paste the token as the password. The login goes inside the Dockge container because Dockge runs `docker` from there.)
3. **Create the stack.** In Dockge: **+ Compose**, name it `smart-packer`, paste in the contents of `docker-compose.prod.yml`, and fill in the **.env** box:
   ```
   ADMIN_PASSWORD=<strong password for the first admin account>
   AUTH_SECRET=<output of: openssl rand -base64 32>
   APP_URL=https://packer.example.com   # the URL users will actually visit
   TZ=America/New_York
   # optional:
   # APP_PORT=3000        # host port to publish the app on
   # IMAGE_TAG=latest     # or pin e.g. sha-1a2b3c4 / 1.2.3
   # ADMIN_USERNAME=admin
   # LOG_LEVEL=info
   ```
4. **Deploy.** Dockge pulls both images and starts `db`, then `migrate` (migrations plus the first-run admin seed), then `app`. Sign in at `APP_URL` with `ADMIN_USERNAME`/`ADMIN_PASSWORD`.

#### Updating

Push to `main` and wait for the workflow to finish, then click **Update** on the stack in Dockge (the same as `docker compose -f docker-compose.prod.yml pull && docker compose -f docker-compose.prod.yml up -d`). `migrate` re-runs automatically and applies any new migrations before the new `app` starts. To roll back, set `IMAGE_TAG` to an earlier `sha-…` tag and redeploy. Be careful here: migrations only run forward, so rolling back past a schema change can leave the old app out of step with the database. Take a backup (see below) before updates that add migrations.

#### Versioning: which build am I running?

The bottom of the Dashboard shows what's running, for example `Smart Packing Planner v0.2.0 · build 1a2b3c4 (Sep 27, 2026) · Check for updates`:

- **`v0.2.0`** is the release version, taken from `version` in `package.json`.
- **`build 1a2b3c4`** is the exact commit the image was built from. GitHub Actions bakes it in. Click it to open that commit.
- **Check for updates** opens the commit history on `main`. If the newest commit there is newer than your build (and its *Publish Docker images* run has finished), click **Update** in Dockge.

Local `pnpm dev` and local `docker compose build` don't have a commit baked in, so they show "local build".

To cut a numbered release:

```bash
npm version minor        # or patch / major: bumps package.json, commits, and tags v0.3.0
git push --follow-tags   # pushes the commit and the tag
```

The tag push publishes images tagged `0.3.0` and `0.3` alongside `latest`, so you can pin `IMAGE_TAG=0.3.0` in Dockge. Pushes without a version bump still publish `latest` and are told apart by the build commit. (`npm version` only edits `package.json` and creates the git commit and tag, so it works fine in this pnpm project.)

Backups work the same way as with the source-built stack, with two differences. Dockge names the stack after its folder, so the volume is `smart-packer_db-data` rather than `smart_packer_db-data`. And the `docker compose exec …` commands need to be run from the stack's folder (`/opt/stacks/smart-packer` by default), or with `-f` pointing at its compose file.

Built with [Next.js](https://nextjs.org) (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma, and PostgreSQL. See DESIGN.md for the full architecture.

## Backup & Restore

All application data lives in the `db` container's PostgreSQL volume — the `app`/`migrate` containers themselves are stateless and disposable. Two backup approaches both work; pick one. Both were tested end-to-end (backup → wipe the volume entirely → restore → data intact) while writing this doc.

Also back up `.env` — it's not in the database, and losing `AUTH_SECRET` invalidates every existing session (everyone has to sign in again; not data loss, but worth keeping alongside your backups regardless).

### Option A: `pg_dump` (recommended — small, portable, human-readable)

**Backup** (the container must be running):

```bash
docker compose exec db pg_dump -U packer -d smart_packer > backup.sql
```

**Restore** into a running (typically freshly-created, empty) database:

```bash
cat backup.sql | docker compose exec -T db psql -U packer -d smart_packer
```

If restoring into a database that already has data in it, drop and recreate it first so the restore starts clean:

```bash
docker compose exec db psql -U packer -d postgres -c "DROP DATABASE smart_packer;"
docker compose exec db psql -U packer -d postgres -c "CREATE DATABASE smart_packer;"
cat backup.sql | docker compose exec -T db psql -U packer -d smart_packer
```

### Option B: Docker volume backup (full byte-for-byte copy, including PostgreSQL's own files)

**Backup** (stop `db` first for a consistent snapshot — an in-use volume can still be tarred, but a stopped one guarantees no mid-write files):

```bash
docker compose stop db
docker run --rm -v smart_packer_db-data:/data -v "$(pwd)":/backup alpine \
  tar czf /backup/db-data-backup.tar.gz -C /data .
docker compose start db
```

**Restore**, into a fresh volume (recommended sequence — let Compose create and own the volume first, then populate it, rather than pre-creating the volume yourself, which Compose will warn about not recognizing):

```bash
docker compose down          # remove containers; add -v first if the volume needs to be emptied
docker compose up -d db      # recreates the (empty) named volume if it doesn't exist
docker compose stop db
docker run --rm -v smart_packer_db-data:/data -v "$(pwd)":/backup alpine \
  sh -c "rm -rf /data/* && tar xzf /backup/db-data-backup.tar.gz -C /data"
docker compose start db
```

(Windows + Git Bash: `docker run` with a `-v` mount starting in `/` can get mangled by MSYS's automatic path conversion — prefix the command with `MSYS_NO_PATHCONV=1` if the container reports it can't find `/backup`. Not needed on Linux/macOS deployment hosts.)

### Which to use

`pg_dump` is the better default: it's a portable SQL text file (readable, diffable, works across PostgreSQL versions), and it's what was used above to verify Options A and B both actually restore correctly. The volume backup is a reasonable belt-and-suspenders addition for a full-server migration, since it also captures anything Postgres itself keeps outside the logical data (though this app doesn't currently rely on anything at that level).

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
| `default_bag` | No | Name of the Bag this Item goes in by default. Bags are created automatically. Blank leaves an existing Item's default Bag unchanged. |

### Import semantics

- **Upsert by name.** Re-importing is safe and additive: an existing Item's scalar fields are updated, and its module memberships and children are **merged** (union), never replaced or removed.
- **Validated before anything is written.** The whole file is checked first — missing `name`/`category`, a non-positive `default_quantity`, an item listed as its own child, an unresolved child reference, or a parent/child **cycle** (checked against the file *and* your existing data) — and the import is rejected as a whole if any row fails. You'll see a row-by-row error list and a create/update summary before confirming.
- **Module-child invariant.** If a parent belongs to a Module, its children are ensured to belong to that Module too, even across multi-level chains.

### Export

Downloads the exact same shape for every Item you own (active and inactive). Round-tripping is lossless: exporting and immediately re-importing the same file validates cleanly and updates everything in place with no new rows.
