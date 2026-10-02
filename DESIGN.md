# Smart Packing Planner — Design & Requirements Document

**Version:** 1.12
**Supersedes:** 1.11, 1.10, 1.9, 1.8, 1.7, 1.6, 1.5, 1.4, 1.3, 1.2, 1.1, 1.0

---

## Revision Summary (1.11 → 1.12)

This revision adds **Tasks**: a pre-departure (and after-return) checklist that sits alongside the packing list — "take out the garbage", "board the dog", "update the ACR beacon registration" — each timed relative to the Trip's dates. See "Pre-Trip & Post-Trip Tasks".

1. **Master Tasks** (new Tasks page): name, notes, active, and timing — a number of days before departure (Trip start date) or after return (end date, else start date). Presets match the common cases (day of / day before / week before / 2 weeks / 4 weeks / 3 months before departure; day of / day after / week after return); any other day count is allowed. FR-059.
2. **One level of sub-tasks** (e.g. "Pets" → Clean Litter Box, Refill Cat Feeder, Board Dog). A sub-task always shares its parent's checklist (Pre-Departure / After Return) and either inherits the parent's timing or has its own. Checkboxes are independent. FR-060.
3. **Reaching a Trip** mirrors Items: Modules contain Tasks as well as Items, so Trip generation and later Module merges bring Tasks (with their active sub-tasks); specific Tasks can be added by search; one-off custom Tasks can be added to a single Trip. Trip Tasks are snapshots (like FR-014a), with timing resolved to a concrete offset. Inactive Tasks never reach a Trip. FR-061.
4. **Trip page:** a Pre-Departure checklist first, grouped by timeframe in the order things happen, with each group's due date (when the Trip has dates) and overdue highlighting; an After Return checklist after the packing list. Removing a Task removes its sub-tasks from that Trip. FR-062.
5. **Printing:** Pre-Departure always prints before the packing list and After Return after it, both with due dates; a print option omits them. FR-063.
6. **Dashboard "Due Soon":** unfinished Trip Tasks due within a week or overdue (always while the Trip hasn't ended; for two weeks after it has). No email/push reminders — the app has no mail server. FR-064.
7. **Duplicate Trip** copies Tasks unchecked with sub-task nesting kept; the Trip JSON export and REST API include Tasks with due dates; `GET /api/v1/tasks` added.
8. **Tasks CSV** (separate from the Items CSV): `name, days, relative_to, parent, modules, notes, active`, same validate-then-commit, upsert-by-name, additive semantics. FR-065.

---

## Revision Summary (1.10 → 1.11)

This revision turns Bags from per-Trip records into reusable master data, and lets each Item name a default Bag.

1. **Bags are owner-level master data**, like Categories: one row per physical bag, managed on a new **Bags** page (name, type, color, weight limit, active). A Trip's bags are simply the Bags its items are assigned to; there is no per-Trip bag list to rebuild for every trip. Revised FR-021, FR-026.
2. **Items have an optional Default Bag** (FR-022a). When an Item becomes a Trip Item — generation, a later Module merge, or adding specific Items (FR-019a) — its default Bag is copied onto the Trip Item as its assignment. Like the other snapshot fields (FR-014a), changing an Item's default later affects only future additions, and reassigning a Trip Item never changes the Item. Custom Trip Items start unassigned; "Save to Items" turns a custom item's trip bag into the new Item's default.
3. **Retiring vs deleting.** An inactive Bag drops out of the bag pickers but stays on every Trip that uses it, so past packing history is unchanged. Deleting a Bag clears it as a default and unassigns its Trip Items everywhere, past Trips included.
4. **One-off bags** are quick-created from the Trip page as ordinary master Bags (then optionally marked inactive), rather than as a second, Trip-only kind of bag.
5. **CSV** gains an optional `default_bag` column (Bags auto-created by name, like Categories). **REST API** gains `GET /api/v1/bags`, and items include their default Bag.
6. **Migration:** existing per-Trip bags became master Bags owned by their Trip's owner, with same-named bags of one owner merged and their Trip Items repointed, so no Trip lost its assignments. Duplicate Trip (FR-058) now copies assignments directly instead of recreating Bags.
7. **Not built:** nested bags (a bag inside a bag). Every Trip Item has at most one Bag.

---

## Revision Summary (1.9 → 1.10)

This revision completes FR-052: an admin UI for creating, deactivating, and password-resetting users beyond the 1.9 first-run bootstrap admin.

1. **`/admin/users`** (admin-only, redirects non-admins to the Dashboard via a new `getCurrentAdmin()` in `src/lib/session.ts`): create a user (username, initial password, optional admin flag), toggle active/inactive per user, reset any user's password. Reuses `userService.createUser` — the same direct-Prisma-plus-Argon2id function the 1.9 seed script uses, now shared between both (seed.ts was refactored to call it rather than duplicate the logic).
2. **Deactivation now actually blocks access**, not just a cosmetic flag: `isAdmin`/`isActive` are registered as `user.additionalFields` in `src/lib/auth.ts` so they ride along on the session (no extra query needed to check them), a `databaseHooks.session.create.before` hook rejects new sign-ins for an inactive user with a clean 403 ("This account has been deactivated."), and `getCurrentUser()` separately re-checks `isActive` on every request so a user deactivated mid-session is cut off before their existing session cookie expires, not just blocked from signing in again.
3. **An admin cannot deactivate their own account** (`userService.setUserActive` throws) — a deliberate guard against self-lockout mid-session, since there's no other account guaranteed to still have access.
4. **Still not built**: this remains the direct-Prisma pattern from 1.9, not Better Auth's `admin` plugin (role-based permissions, ban/unban, impersonation) — that plugin is a bigger schema and scope commitment (a `role` field/`adminRoles` config) that Version 1's single-admin-role model doesn't need yet. Revisit if roles beyond "admin" and "standard user" become necessary.

---

## Revision Summary (1.8 → 1.9)

This revision implements real authentication (FR-049–FR-051), replacing the single-hardcoded-dev-user stub every service/page has called through `getCurrentUser()` since Milestone 1. Row-level `ownerId` scoping itself needed no changes — it was already correct, just fed a stub user; it now receives a real session user.

1. **Better Auth is wired up** with the Prisma adapter, the `username` plugin (Credentials-style username + password, no email/mail-server flows), and Argon2id password hashing via `@node-rs/argon2` (chosen over the `argon2` package because it ships prebuilt platform binaries — `argon2` requires a native compiler toolchain, which isn't guaranteed on every dev/build machine; `@node-rs/argon2` needed no such assumption and defaults to Argon2id already, matching FR-050 with zero custom config).
2. **Schema**: Better Auth's Prisma adapter owns `User`'s core fields (`id`, `name`, `email`, `emailVerified`, `image`, plus `username`/`displayUsername` from the plugin) and adds `Session`, `Account` (credentials — the Argon2id hash lives in `Account.password`, keyed by `providerId: "credential"`; a user has no direct password column), and `Verification` (unused in Version 1 — no email flows). Generated via `better-auth generate` against a hand-written `src/lib/auth.ts`, then hand-merged with the app's existing `isAdmin`/`isActive`/ownership-relation fields on `User` rather than accepted verbatim — the generated schema is a starting point, not something to apply blindly. `passwordHash` is gone from `User`.
3. **Better Auth requires an email even though this app has none to collect** (DESIGN.md's whole premise is no mail server). Accounts are provisioned with a synthesized, non-deliverable address (`{username}@local.invalid`, using the RFC 2606 reserved `.invalid` TLD) purely to satisfy the schema — never displayed, never emailed to.
4. **No self-service signup, enforced at the library level, not just by omitting a UI**: `emailAndPassword.disableSignUp: true` blocks the sign-up endpoint outright (verified: `POST /api/auth/sign-up/email` returns 400 `EMAIL_PASSWORD_SIGN_UP_DISABLED`, even absent any signup page). Because that flag blocks *all* invocations of `signUpEmail` — including server-side calls, not only the public HTTP route — admin-driven user creation (the seed script's first-run bootstrap, and any future admin tooling) creates the `User` and its credential `Account` row directly via Prisma, hashing with the same `@node-rs/argon2` call Better Auth itself is configured to use, so the result verifies correctly on login. This is *not* Better Auth's `admin` plugin (which models permissions via a `role` field/`adminRoles` config, a bigger schema and scope commitment) — deferred until the "admin user management" gap (create/deactivate/reset-password UI for users beyond the bootstrap admin, per FR-052) actually gets built, at which point revisit whether the `admin` plugin's `createUser` is a better fit than continuing the direct-Prisma pattern.
5. **Authorization boundary**: `getCurrentUser()` (`src/lib/session.ts`) calls `auth.api.getSession()` and `redirect("/login")` if absent, so it keeps returning a guaranteed-present user to its ~30 existing call sites with no signature change. `src/proxy.ts` (Next.js 16 renamed `middleware.ts` → `proxy.ts`) does a coarse, cookie-presence-only redirect for pre-render UX — per FR-051/CVE-2025-29927, this is explicitly *not* the authorization boundary; `getCurrentUser()` inside actual page/action code is.
6. **Deployment**: no new environment variables — `AUTH_SECRET` and `APP_URL` (both already present since the original Docker scaffold) map directly to Better Auth's `secret` and `baseURL`. `@node-rs/argon2`'s Linux binary needed two separate fixes to actually reach the `app` container: (a) the pnpm lockfile, generated on a Windows dev machine, only resolved the Windows build of the platform package by default — fixed via `supportedArchitectures` in `pnpm-workspace.yaml`; (b) Next's standalone-output file tracing can't follow the dynamic `require()` napi-rs-style native modules use to load their `.node` binary, *and* pnpm nests optional platform packages inside the depending package's own `node_modules` rather than hoisting them, so even a manual `outputFileTracingIncludes` override came up empty — resolved in the `Dockerfile` by installing `@node-rs/argon2` fresh with `npm` (flat resolution, no pnpm nesting) in an isolated scratch directory, then copying the flat result into place.

---

## Revision Summary (1.7 → 1.8)

This revision implements Trip dates and the Trip History page, both previously named only in passing (Trips page bullet, Suggested Application Pages) with no detail.

1. **Trip dates** (`startDate`/`endDate`, already in the schema since Milestone 1 but never exposed in the UI) are now set at trip creation. They are not editable afterward in this revision.
2. **Trip History page** (`/trips/history`) lists every Trip — not just upcoming ones — sorted by `endDate ?? startDate ?? createdAt` descending, each showing its date range (if set) and a packed/total item count, with links to view or duplicate it.
3. **Duplicate Trip**: copies a Trip's *current* Trip Items (including custom additions, quantity overrides, and exclusions — i.e. what was actually packed/customized, not a re-run of module generation) and recreates its Bags (preserving item-to-bag assignment), into a new Trip. Packed status resets to unpacked; dates are not copied (a duplicate is presumably for a different future trip). New FR-058, UC-020.
4. **"Compare trips" is explicitly out of scope for now** — DESIGN.md's original Trip History bullet named it with no further detail, and it's deferred to Future Enhancements rather than guessed at. Nothing about Trip History or Duplicate blocks adding it later.

---

## Revision Summary (1.6 → 1.7)

This revision makes the Docker Compose deployment fully self-contained: **no manual `pnpm`/Prisma CLI commands are required to deploy or upgrade.** Previously (and as originally implemented in 1.1–1.6), applying migrations and seeding the first-run admin were manual steps run from a host machine with the project's dependencies installed — workable for local development, but not for a "hand someone a compose file and they run it" deployment (e.g. a Docker management UI like Dockge, which only runs `docker compose up`).

1. **A `migrate` service runs automatically before `app` starts**, applying pending Prisma migrations and performing the first-run admin seed (Account provisioning's "First-run bootstrap"), then exits; `app` waits for it to complete successfully (`depends_on: condition: service_completed_successfully`). A plain `docker compose up` now fully deploys and upgrades the application, end to end.
2. **The application image is built from two targets** in the same `Dockerfile`: `app` (the persistent, always-running service — Next.js standalone output only, no Prisma CLI) and `migrate` (a one-shot init container carrying the Prisma CLI + seed script, which the always-running `app` image does not need). This keeps `app`'s image small — the `prisma` CLI package alone pulls in Prisma Studio, its embedded dev database, and an MCP SDK (several hundred MB the app itself never touches), which is fine to pay once in a container that runs for seconds and exits, but not worth carrying in the container that runs continuously.
3. **Migrations and seeding are idempotent by design**, unchanged from 1.2/1.6: `prisma migrate deploy` only applies pending migrations, and the seed script only creates the initial admin if zero users exist — so `migrate` running on every `docker compose up` (including restarts and upgrades) is safe.

---

## Revision Summary (1.5 → 1.6)

This revision **removes server-side PDF generation (Playwright/headless Chromium) entirely**, replacing it with a browser-printable checklist view. Product behavior (two-column paper-saving layout, category/bag grouping, print options) is preserved; only the rendering mechanism changes.

1. **No more Playwright, no more Chromium, no more PdfExportService.** The checklist is a plain server-rendered HTML page styled with `@media print` CSS (the same `column-count: 2` / `break-inside: avoid` technique 1.1 already specified, just applied to a page the browser prints itself). A "Print" button calls `window.print()`; the browser's native dialog handles pagination, paper size, grayscale, and "Save as PDF" as just another print destination.
2. **Why:** the Playwright approach required bundling Chromium (the official Playwright base image alone runs ~1.5-2GB, since it also includes Firefox and WebKit) into the deployment image for a self-hosted, typically single-user app where the browser doing the printing is already sitting right there on the user's machine. Avoiding Chromium entirely removes that image-size cost and a whole dependency (Playwright + its OS-level Chromium libraries) with no loss of the two-column/no-split/print-options requirements that actually matter.
3. **Real capability lost:** custom per-page headers/footers with app-controlled page numbering ("Page 2 of 5" styled by us) are **not achievable** from a browser print — that's a Paged Media feature (`@page { @top-center {...} }`) that browsers don't implement for HTML-to-print, unlike Playwright's `page.pdf()` `headerTemplate`/`footerTemplate`. Chrome's own print dialog has a generic, unstyled "Headers and footers" toggle (title/URL/date/page number) as a partial substitute. FR-034 and FR-036 are revised to reflect this rather than pretend it's unaffected.
4. **Category continuation ("(continued)" headings, FR-037) remains deferred** — it was already undeliverable natively under the Playwright/Chromium approach too, so this isn't a new loss.

---

## Revision Summary (1.4 → 1.5)

This revision relaxes one CSV import rule to make incremental imports usable.

1. **A `children` reference may now resolve against an existing Item already in the database, not only a row in the same file.** Previously, every child had to appear as its own row in the same import file, which forced you to re-list unrelated existing Items (e.g. a shared charger) just to add one new item that depends on them. Cycle detection already checked the combined file + existing-data graph, so this doesn't weaken that guarantee — it only widens what counts as a resolved reference. See "Data Import & Export (CSV)" → Import semantics.

This revision adds **CSV export** for master data, mirroring the CSV import format defined in 1.2. It does not change Trip/Bag/print scope.

1. **Master data (Categories, Items — including parent/child relationships and quantities —, and Modules with membership) can now be exported** to the same one-row-per-Item CSV shape used for import, so the two are round-trippable: export, edit offline, re-import (upsert-by-name) is a supported workflow. See "Data Import & Export (CSV)".
2. **Trip/PDF export scope is unchanged.** The only export for Trip data (packing lists) remains the PDF checklist; Trips, Trip Items, Bags, and packing status are still never imported *or* exported via CSV — they stay runtime data generated from master data. FR-028a is revised to state this precisely instead of blanket-excluding all export.
3. New **FR-057** covers the export requirement; new **UC-019** covers the export flow.

---

## Revision Summary (1.2 → 1.3)

This revision swaps the primary authentication framework. It does not change any functional requirement's intent, only which library is the default recommendation.

1. **Better Auth is now the primary authentication choice**, replacing Auth.js (NextAuth v5) as primary. Auth.js v5 remains an acceptable alternative (notably for teams migrating an existing Auth.js codebase) but is deprioritized because it is still beta-labeled in 2026 and the wider ecosystem, including Auth.js's own maintainers, now directs new projects to Better Auth. See Authentication section.

---

## Revision Summary (1.1 → 1.2)

This revision resolves previously open behavioral decisions. It **removes the multi-user sharing model entirely** — data is now fully isolated per user — and pins down trip generation, snapshotting, and account provisioning.

1. **Trip Items are snapshots.** At generation, each Trip Item copies the Item's name, category, notes, and default quantity. Later edits to the master Item do not change existing Trips, so a Trip reflects what was actually packed.
2. **Generation is one-shot, with add-modules-later.** Generation runs once. The user may afterward add additional Modules to an existing Trip (merging in any items not already present). Modules are never *removed* from a Trip; to drop items, the user deletes them from the Trip list individually.
3. **Parent quantity does not scale children.** Increasing a parent Trip Item's quantity never changes child quantities.
4. **Children are independent once added.** Removing a parent (from a Module or a Trip) does not remove its children.
5. **No sharing — single-owner isolation.** A Trip belongs to exactly one user; only that user can see or edit it. Categories, Items, Modules, and Trips are all private to their owner and never visible to other users.
6. **Users are admin-created.** No open self-service signup.
7. **CSV import defined; no data export.** Master data is imported from a single one-row-per-Item CSV. Version 1 has no structured export — output is PDF only, with structured export left to the future REST API.

---

## Revision Summary (1.0 → 1.1)

This revision changes four technical decisions and cleans up requirement numbering. Product behavior (categories, items, modules, trips, parent/child expansion, bags, printing) is unchanged.

1. **UI framework:** Replaced Bootstrap 5 / React-Bootstrap with **Tailwind CSS + shadcn/ui** (Radix UI primitives).
2. **Data access:** Removed the dedicated Repository Layer. **Prisma Client is the data-access layer**; services call Prisma directly.
3. **Authentication:** Replaced hand-rolled username/password auth with **Auth.js (NextAuth v5)** as a maintained framework, with Better Auth documented as an approved alternative.
4. **PDF export:** The bespoke "layout engine" is replaced by **server-side HTML/CSS rendered to PDF via headless Chromium (Playwright)**, using CSS multi-column layout for column balancing.

All Functional Requirements have been **renumbered sequentially (FR-001 … FR-052)**. Version 1.0 contained several duplicate FR numbers (FR-047–FR-052 appeared twice); those have been consolidated. A mapping is noted where behavior is affected.

---

## Purpose

Smart Packing Planner is a modular travel packing application designed to eliminate forgotten items while minimizing overpacking. Rather than building a packing list from scratch for every trip, users build reusable modules (such as Cruise, Camera, International Travel, or Sporting Event) that automatically populate a trip-specific packing list.

The application combines reusable packing modules, master item definitions, parent/child item relationships, and trip-specific customization to make packing faster, more consistent, and more reliable.

## Goals

The application should:

- Eliminate forgotten items.
- Reduce duplicate data entry.
- Allow reusable packing modules.
- Support different styles of travel.
- Generate trip-specific packing lists.
- Allow each trip to customize quantities without affecting the master inventory.
- Support complex equipment relationships (camera bodies, chargers, batteries, etc.).
- Learn from previous trips through reusable templates and history.

---

## Core Concepts

### Categories

Categories are used strictly for organization and display. Examples: Clothing, Shoes, Electronics, Camera, Medications, Toiletries, Documents, Accessories, Miscellaneous. Each category has a display order used when rendering packing lists.

### Items

An Item represents one packable object (e.g., Patagonia Nano Puff, Passport, Camera Batteries, Flip Flops, Toothbrush). Each item exists only once in the master database.

**Item Properties:** Name, Category, Default Quantity, Notes, Active/Inactive, Parent/Child Relationships.

Example — Name: `OM-D E-M1 Mk II Battery`; Category: Camera; Default Quantity: 3; Notes: "Charge before departure".

### Modules

Modules represent reusable trip types (e.g., Cruise, Flight, Camera, Alaska, World Cup, Safari, International Travel, Pool / Hot Tub, Work Travel). Modules contain Items, and an Item may belong to multiple Modules.

Example — *Portable Battery* belongs to Flight, Cruise, World Cup, City Travel. *Flip Flops* belongs to Cruise, Pool, Beach Vacation.

### Trips

Trips are generated from one or more Modules. The generated packing list is independent of the master data and may be customized without modifying Modules or Items.

Example — Trip: *Vancouver + Alaska Cruise*; Modules: Flight, Cruise, Alaska, Camera, World Cup, Pool.

> **Trip Items are snapshots (1.2).** When a Trip is generated, each Trip Item copies the source Item's name, category, notes, and default quantity into the Trip. Subsequent edits to the master Item (rename, recategorize, quantity change, deactivate) **do not** alter existing Trips. This ensures Trip History reflects what was actually packed. Consequence for the schema: a Trip Item stores its own denormalized name/category/notes rather than relying solely on a live foreign key to the master Item. A reference to the originating Item ID may be retained for convenience but is not authoritative for display.

> **Generation is one-shot, with later module additions (1.2).** Packing-list generation runs once per Trip. A user may afterward **add** one or more additional Modules to an existing Trip — useful when a Module was forgotten at creation or did not yet exist. Adding a Module merges its (expanded, deduplicated) items into the Trip, skipping any item already present, and never disturbs existing packed status, quantity overrides, custom items, or bag assignments. Modules are **not** removable from a Trip; to remove unwanted items the user deletes them individually from the Trip list.

### Parent / Child Item Relationships

Some items naturally require other items.

- *OM-D E-M1 Mk II* → BLH-1 Batteries, Battery Charger
- *TG-7* → TG-7 Batteries, Charger, Memory Card
- *Laptop* → Charger, Mouse
- *Drone* → Batteries, Propellers, Charger

When a parent item is added to a Module, required child items are automatically added to that Module if not already present. Duplicate child items are never created.

> **Clarification (new in 1.1):** Child expansion is **recursive** — if a child item is itself a parent, its children are also expanded. Expansion terminates on already-present items and must guard against cycles.

> **Quantity & independence (1.2):** Child quantities are **fixed** — increasing a parent's quantity (in a Module or a Trip) never multiplies or increases child quantities. Once added, a child Item is **independent** of its parent: removing the parent (from a Module or a Trip) does **not** remove the child. This matters because a child such as "Charger" is often shared across many parents.

### Duplicate Prevention

Items are uniquely identified by Item ID. If an Item exists in multiple Modules selected for a Trip, it appears only once in the generated packing list (e.g., Portable Battery ×1, not ×3).

### Default Quantities

Each Item has a master Default Quantity. When a Trip is generated, the default quantity is copied into the Trip. Changing the quantity during a Trip must **not** modify the master Item.

### Trip-Specific Overrides

Each generated Trip Item supports: Quantity Override, Packed, Removed from Trip, Trip Notes, and Bag Assignment (see Suitcase Assignment).

---

## Suggested Application Pages

- **Dashboard:** Upcoming Trips, Previous Trips, Create New Trip, Statistics.
- **Trips:** Create/name a trip, set dates and destination, select modules, generate packing list.
- **Packing List (primary screen):** Grouped by Category. Supports check-off, quantity adjustment, remove item, add custom item, search, collapse categories.
- **Master Items:** Create/edit items (category, default quantity, notes, parent/child relationships).
- **Modules:** Create reusable packing modules.
- **Categories:** Manage category names and display order.
- **Trip History:** Duplicate trip, review packing list. *(Implemented in 1.8; "compare trips" deferred — see Future Enhancements.)*
- **Settings:** Theme, Backup, CSV Import & Export of master data (see Data Import & Export). *(Trip-level output in Version 1 is limited to the browser-printable checklist — see Print & Export; structured Trip export is deferred to the future REST API.)*
- **Admin (`/admin/users`, admin-only):** Create users, deactivate/reactivate users, reset passwords. *(Implemented in 1.10 — see Account provisioning and Revision Summary 1.9 → 1.10.)*

---

## Suitcase Assignment

Each Trip Item may optionally be assigned to a specific bag. Bag assignments are specific to a Trip and do not modify the master Item.

**Bags are master data (Revised in 1.11)** (e.g., Checked Suitcase, Carry-on, Camera Backpack, Pelican Case, Day Pack, Dry Bag): one record per physical bag, shared by every Trip, with properties Name, Bag Type, Color (optional), Weight Limit (optional), Active, Current Weight (future). A Trip's bags are the Bags its items are assigned to.

**Default Bag (1.11):** each Item may name a default Bag. When the Item is added to a Trip, the Trip Item starts in that Bag; it can then be moved to any other Bag for that Trip only. Bags first needed on a specific Trip are quick-created from the Trip page as master Bags; an inactive Bag is hidden from pickers but remains on Trips that already use it.

**Packing workflow:** mark an item packed, assign it to a bag, move it between bags. Packing status is independent of bag assignment.

**Views:** Standard (grouped by Category) and Bag View (grouped by Bag). **Filters:** All / Packed / Unpacked / Bag / Category.

---

## Pre-Trip & Post-Trip Tasks (New in 1.12)

Tasks are things to *do* rather than things to *pack*: chores before leaving (take out the garbage, refill the cat feeder, lock the garage), preparation weeks ahead (immunizations, firmware updates, informing banks), and follow-ups after getting home (pick up the dog, upload photos).

**Master Tasks** have: Name, Notes (optional), Active, and **timing** — `offsetDays` before **departure** (the Trip's start date) or after **return** (its end date, falling back to the start date). Timeframe headings derive from the day count: 0 → "Day Of Departure", 1 → "Day Before Departure", 7 → "Week Before Departure", multiples of 30 → "N Months …", multiples of 7 → "N Weeks …", otherwise "N Days …" (and "… After Return" for return tasks).

**Sub-tasks:** one level deep. A sub-task's parent is always top-level, a task with sub-tasks can't itself become a sub-task, and a sub-task always shares its parent's anchor (departure/return). A sub-task's timing is either inherited (`offsetDays` null) or its own; on a Trip it's listed under its parent when the two share timing, otherwise in its own timeframe group with the parent's name for context. Deleting a parent Task turns its sub-tasks into top-level Tasks, first giving inheriting ones the parent's timing.

**Reaching a Trip** follows the Item model: Modules contain Tasks (generation and later Module merges bring them, with their active sub-tasks); Tasks can be added individually by search (restoring any previously removed from that Trip); and one-off custom Tasks can be added to a single Trip. **Trip Tasks are snapshots** — name, notes, anchor, and the *resolved* offset are copied, so later master edits don't change existing Trips. Inactive Tasks never reach a Trip.

**On a Trip:** Pre-Departure appears first, grouped by timeframe from earliest to day-of, with the due date per group when the Trip has dates and overdue groups (unfinished tasks past their due date) highlighted. After Return appears after the packing list. Each task is checked off independently; removing a task from a Trip also removes its sub-tasks there (unlike child Items, sub-tasks belong to one parent only).

**Due Soon (Dashboard):** unfinished Trip Tasks due within the next 7 days, plus overdue ones — always while their Trip hasn't ended, and for 14 days after it has (so a forgotten task from an old trip doesn't linger). The app sends no email or push reminders.

---

## Print & Export (Revised in 1.6)

Users can print a printer-friendly packing checklist from any Trip. The format minimizes paper use while remaining easy to read and check off by hand. **There is no server-generated PDF file** — the checklist is a dedicated, print-styled page; the user prints it (or uses their browser's "Save as PDF" print destination) directly. This is a deliberate simplification over 1.1–1.5's Playwright/Chromium approach — see Revision Summary (1.5 → 1.6) and "Printable Layout — Rendering Approach".

**Default layout:** two evenly sized columns via CSS multi-column. The top of the document (once, not repeated per page) shows Trip Name, Destination, Travel Dates, and Print Date, followed by category headings, a checkbox beside every item, and quantity per item.

**Print options:** include categories / quantities / notes / bag assignments / packed status; print only unpacked or all items; color or grayscale (grayscale/color is a browser print-dialog setting, not an app option).

**Optional formats:** Standard (default), Compact (smaller font, reduced spacing), By Bag (grouped by assigned bag), Blank Checklist (unchecked copy for reuse).

**On-page identification (replaces "PDF metadata" from 1.5):** Trip Name, Destination, and Print Date are rendered as visible page content (not embedded PDF document-properties, since there's no app-controlled PDF file to attach them to). If the user's own "Save as PDF" print flow produces a PDF, whatever metadata Chrome itself assigns applies — the app does not set it.

> **Data export scope (Revised in 1.4):** Trip-level output remains print/checklist-only — there is no bulk export of Trip/Trip Item/Bag/packing-status data, and none is planned short of the future REST API. **Master data** (Categories, Items, Modules), however, now has a CSV export mirroring the import format — see "Data Import & Export (CSV)".

---

## Data Import & Export (CSV) (Import: new in 1.2; Export: new in 1.4)

Version 1 supports **CSV import and export** of the reusable master data — **Categories, Items (with parent/child relationships), and Modules (with membership)**. Import lets users migrate an existing packing list (typically a spreadsheet) into the application; export produces the same shape back out, so the two round-trip (export → edit offline → re-import, safe because import upserts by name). Trips are *not* imported or exported via CSV in either direction; they are generated from Modules and remain runtime data. Bags appear only as each Item's `default_bag` name (1.11), auto-created like Categories.

### Why one denormalized file

The data model has three many-to-one / many-to-many relationships (Item→Category, Item↔Module, Item↔Item parent/child). Rather than require several normalized files, import uses a **single "Items" CSV with one row per Item**, expressing relationships through named references and multi-value columns. This keeps the file easy to produce from an existing spreadsheet while still capturing the full structure. Categories and Modules do not need their own files — they are created on demand by name.

### File format

- UTF-8 encoding, comma-delimited, RFC 4180 quoting (fields containing commas, quotes, or newlines are double-quoted).
- A header row is **required**; column order is not significant (columns are matched by header name, case-insensitive).
- **Multi-value cells use the pipe character `|`** as the intra-cell separator (e.g., `Flight|Cruise|World Cup`). The pipe is chosen because it rarely appears in item or module names and avoids colliding with the CSV comma delimiter.

### Columns

| Column | Required | Description |
|---|---|---|
| `name` | Yes | The Item's name. Unique per user; used as the key for upsert and for child references. |
| `category` | Yes | Category name. Created automatically if it does not yet exist (appended to the end of the display order). |
| `default_quantity` | No | Positive integer. Defaults to `1` if blank. |
| `notes` | No | Free-text notes. |
| `active` | No | `true` / `false`. Defaults to `true`. |
| `modules` | No | Pipe-delimited list of Module names this Item belongs to. Modules are created automatically if they do not exist. |
| `children` | No | Pipe-delimited list of **Item names** that are children of this Item (parent → children direction, matching the source design). |
| `default_bag` | No | Name of the Item's default Bag *(1.11)*. Bags are created automatically if they do not exist. Blank or absent leaves an existing Item's default Bag unchanged (consistent with import being additive), so re-importing an older file never clears defaults. |

### Example

```csv
name,category,default_quantity,notes,active,modules,children
Passport,Documents,1,,true,Flight|International Travel,
OM-D E-M1 Mk II,Camera,1,Charge before departure,true,Camera,BLH-1 Battery|Battery Charger
BLH-1 Battery,Camera,3,Charge before departure,true,Camera,
Battery Charger,Camera,1,,true,Camera,
Portable Battery,Electronics,1,,true,Flight|Cruise|World Cup,
Flip Flops,Shoes,1,,true,Cruise|Pool,
Socks,Clothing,7,,true,,
Camera Batteries,Camera,2,,true,Camera,
```

### Import semantics

- **Two-pass, scoped to the importing user.** Pass 1 upserts every Item (and creates any referenced Categories and Modules) using scalar fields and module memberships. Pass 2 wires parent/child relationships by looking up child names. All rows are processed within a single database transaction.
- **Upsert by name.** If an Item with the same name already exists for the user, its scalar fields are updated and its module memberships and children are **merged** (union), so re-running an import is safe and additive rather than duplicating data.
- **Every child must resolve to a known Item.** A `children` reference must match either another row's `name` in the same file, or an Item that already exists in the database for the importing user (*Revised in 1.5* — previously, file-local rows only). A reference that resolves to neither is a validation error; the importer never silently invents an item with no category. (Modules, by contrast, are just names and are auto-created.)
- **Parent/child invariant enforced after wiring.** For consistency with FR-009, once relationships are wired, any child of a parent that belongs to a Module is ensured to also belong to that Module. Child quantities are the child's own `default_quantity` and are never derived from the parent (per FR-015a).
- **Validation & preview.** The importer validates the whole file and presents a row-level report (errors and a summary of what will be created/updated) **before** committing. Detected problems include: missing `name` or `category`, non-integer or non-positive `default_quantity`, an unresolved `children` reference, an Item listed as its own child, and any parent/child **cycle**. If any row fails validation, the import is rejected as a whole (all-or-nothing).

### Export (New in 1.4)

- **Same shape as import.** Export produces one row per Item, with the identical `name,category,default_quantity,notes,active,modules,children` columns, RFC 4180 quoting, and pipe-delimited multi-value cells. A file exported from the app and re-imported unchanged is a no-op update (every field matches what's already there).
- **Scope: all of the user's Items**, active and inactive, regardless of Module or Trip usage. `category` is the Category name; `modules` lists every Module the Item currently belongs to; `children` lists the Item's direct children by name (one level — a grandchild appears on its own parent's row, not repeated on the ancestor's row, matching how import interprets `children`).
- **Not exported.** Category display order and Module-level metadata beyond membership are not separately represented in this format (Categories/Modules only exist in the export as names referenced from Item rows, same as on import). Trips, Trip Items, Bags, packing status, and per-trip overrides are never exported — see "Not imported/exported" below.
- **Delivery.** A direct file download from Settings (`GET`, `Content-Type: text/csv`, `Content-Disposition: attachment`) — no background job or email delivery for Version 1.

### Not imported/exported

Trips, Trip Items, Bags, packing status, and per-trip overrides are never imported or exported via CSV — they are runtime data generated from the master data above. The only Trip-level output is the browser-printable checklist (see Print & Export).

---

## Printable Layout — Rendering Approach (Revised in 1.6)

Version 1.0 specified a custom layout engine measuring rendered category heights to distribute columns by hand. 1.1 delegated that to a browser's layout engine, but still generated a PDF file server-side via headless Chromium (Playwright). **1.6 goes one step further and removes server-side rendering entirely**: the checklist is a plain server-rendered page (Next.js Server Component, same as every other page in the app) styled for print with `@media print` CSS, and the user's own browser does the printing — no headless browser process, no PDF file ever touches the server.

### Print route

A dedicated route (e.g. `/trips/[id]/print`) renders *only* the checklist content — no nav, no interactive controls (buttons, selects, forms) from the main Packing List screen. Print options (Standard/Compact/Large, include notes/bag assignments, unpacked-only, By Category/By Bag) are query params the route reads server-side, reusing the same grouping/filtering already built for the interactive Packing List page (view/filter/scope). A "Print" button on the page calls `window.print()`.

### Column layout

The two-column paper-saving layout is still produced with CSS multi-column — unchanged from 1.1's approach, just applied under `@media print` instead of fed to Playwright:

```css
@media print {
  @page { size: letter; margin: 1.4cm 1.2cm; }   /* A4 selectable via option */
  .checklist { column-count: 2; column-gap: 1.4cm; column-fill: auto; }
  .category  { break-inside: avoid; }            /* never split a category */
}
```

- `column-fill: auto` fills the first column before spilling into the second, minimizing page count (best paper saving).
- `break-inside: avoid` on each category block keeps categories intact across column and page boundaries.

### Headers, footers, page numbering (capability reduced — see Revision Summary 1.5 → 1.6)

There is no app-controlled per-page header/footer or page numbering ("Page 2 of 5" styled by us) — browsers don't expose that for HTML-to-print (`@page` margin-box content / CSS Paged Media is not implemented by Chromium's print engine, unlike Playwright's headless `page.pdf()` API which had first-class support for it). Trip Name, Destination, and Print Date are instead rendered once at the top of the document. If a page-number/date/title footer is wanted, the user can enable Chrome's own generic "Headers and footers" print-dialog option — its content and styling aren't app-controlled.

### Category continuation ("continued" heading)

Still **deferred**, same reasoning as 1.1: neither approach can repeat a block heading natively when a category spans a page break. Unchanged by this revision (FR-037).

### Why this approach

Every print option — notes, bag assignments, unpacked-only, compact/large themes, and Bag View — is a query param and a CSS class, same as before, just without a rendering engine in between. Bag View reuses the exact grouping already implemented for the interactive Packing List page.

### Trade-off accepted

Losing app-controlled page headers/footers and PDF document metadata (Trip Name/Author/etc. as embedded file properties) is a real capability reduction from 1.1's design. It's accepted because: (a) this is a self-hosted, typically single-user app where "print this and check it off" is the actual use case, not sharing branded PDFs; (b) the browser's own print-to-PDF already produces a usable file when needed; (c) it removes an entire dependency (Playwright) and its OS-level Chromium bundle from the Docker image. If per-page headers/branded PDF metadata become a real need later, reintroducing a server-side renderer (Playwright, or `@react-pdf/renderer` if avoiding a browser process matters more than multi-column support) is a self-contained addition — nothing else in the architecture depends on how the checklist gets to paper.

---

## Application Service Layer (Revised in 1.1)

The application uses a dedicated service layer between the user interface / route handlers and the database. **The user interface never accesses the database directly.** All business rules live in application services so the same logic is reusable by the Web UI, REST API, background jobs, and future mobile apps.

### Data access — Repository Layer removed

Version 1.0 specified a separate Repository Layer wrapping Prisma. **In 1.1 this layer is removed.** Prisma Client is already a typed, centralized data-access abstraction, so a second hand-written wrapper adds ceremony without value at this scale. Services call Prisma directly.

- Services own all business logic and are the only layer that invokes Prisma.
- A thin, focused query helper (a plain function, not a full repository class) may be introduced **only** where a query is genuinely complex or reused across multiple services. This is an exception, not the default structure.
- Database access must not appear in UI components or route handlers.

### Revised architecture

```
User Interface (React Server/Client Components)
        │
        ▼
Route Handlers / Server Actions
        │
        ▼
Service Layer   ── all business logic + all Prisma access
        │
        ▼
Prisma ORM
        │
        ▼
PostgreSQL
```

### Service responsibilities

- **TripService:** create trips, select modules, generate packing lists (snapshotting item name/category/notes/quantity into Trip Items), deduplicate items, apply default quantities, add further Modules to an existing Trip (merge without disturbing existing state), manage trip-specific overrides. Enforces single-owner scoping on every operation.
- **ItemService:** create/update items, manage default quantities, manage categories, manage parent/child relationships (recursive expansion, cycle-safe).
- **ModuleService:** create modules, add items, auto-add required child items, prevent duplicate module items.
- **PackingListService:** mark packed, update trip quantities, remove items from a trip, assign items to bags, filter and sort/group packing lists (including grouping for Bag View and for the print route). *(1.6: no separate PdfExportService — the print route is a presentation-only Server Component reusing this service's grouping/filtering; there is no PDF-generation step to encapsulate.)*
- **TaskService / TripTaskService:** manage master Tasks (sub-task rules, anchor inheritance); snapshot Tasks onto Trips via Modules or directly, check off / remove Trip Tasks, compute Due Soon. *(1.12.)*
- **BagService:** manage master Bags (create, edit, activate/deactivate, delete); Trip Item assignment lives in TripService. *(1.11.)*
- **ImportService:** parse and validate the Items CSV, preview results, and commit the two-pass import (upsert Items, auto-create Categories/Modules, wire parent/child, enforce the module child invariant) within a single transaction, scoped to the importing user.
- **ExportService:** read a user's Categories, Items (with parent/child links), and Modules (with membership) and serialize them to the same Items CSV shape used for import, scoped to the exporting user. *(1.4.)*
- **UserService:** admin-driven user creation, deactivation, and password reset; profile management (delegating credential handling to the auth framework — see below). No self-service signup.

### REST API readiness

Future REST endpoints reuse the same services and must not duplicate business logic. Example:

```
POST /api/trips/{id}/generate  →  TripService.generatePackingList(tripId)
```

---

## Technical Architecture (Revised in 1.1)

Smart Packing Planner is a modern, responsive web application designed for self-hosting, supporting multiple authenticated users, persistent storage, responsive desktop/mobile UIs, future REST API support, local Docker deployment, and long-term maintainability.

### Architecture overview

```
Browser (Desktop / Mobile)
        │  HTTPS
        ▼
Next.js Application  (React + Tailwind CSS + shadcn/ui)
        │
Route Handlers / Server Actions
        │
        ▼
Service Layer  (business logic + Prisma access)
        │
        ▼
Prisma ORM
        │
        ▼
PostgreSQL
```

### Technology stack

**Application framework:** Next.js (single project for frontend and backend — React integration, routing, SSR, Route Handlers, Server Actions, build tooling, environment management). No separate backend service is required for Version 1.

**Frontend:**
- React (via Next.js), TypeScript.
- **Styling: Tailwind CSS** with a small amount of custom CSS where needed.
- **Component library: shadcn/ui** (accessible components built on Radix UI primitives).

> **UI framework rationale (replaces the Bootstrap decision in 1.0):** Tailwind + shadcn/ui is the current default for Next.js App Router projects and works cleanly with React Server Components, where Bootstrap's JavaScript components and React-Bootstrap tend to require client-side wrappers. shadcn/ui components are copied into the codebase (not a black-box dependency), giving full control and easier long-term maintenance, and Radix provides accessibility (focus management, keyboard nav, ARIA) out of the box. Tailwind's utility model also removes the need for a separate SCSS build pipeline.

**Backend:** implemented within the Next.js application — authentication, route handlers, business logic, print/checklist rendering, data validation.

**Service layer:** dedicated, reusable by React UI, route handlers, future REST APIs, background jobs, and future mobile apps. The UI never talks to the database directly.

**Data access:** **Prisma Client, called directly from services.** No separate repository layer (see Service Layer section).

**Database:** PostgreSQL, accessed exclusively through Prisma. Prisma provides strong typing, migrations, relationship management, query generation, and transactions. All persistent data resides in PostgreSQL.

### Authentication (Implemented in 1.9)

Version 1.0 specified hand-implemented username/password authentication. **In 1.1, authentication was delegated to a maintained framework (Auth.js v5 primary). In 1.3, the primary choice was revised to Better Auth. In 1.9, it was actually implemented** — see Revision Summary (1.8 → 1.9) for the integration specifics (schema shape, synthetic email, disableSignUp + direct-Prisma admin provisioning, the authorization boundary, and the two Docker/native-binary fixes it took to get `@node-rs/argon2` running in the container).

- **Better Auth**, with the Prisma adapter and the `username` plugin (Credentials-style username + password; no OAuth in Version 1).
- **Lucia is explicitly excluded** — it was deprecated in March 2025 and is now a learning resource, not a maintained dependency. Auth.js v5 was the prior primary choice but was never implemented against; Better Auth was used from first implementation.

**Password handling:** Argon2id via `@node-rs/argon2` (prebuilt binaries, no native compiler toolchain required — see Revision Summary 1.8 → 1.9 for why this was chosen over the `argon2` package). The application never stores plaintext passwords and never implements its own password hashing scheme beyond calling a vetted library.

**Session protection — security requirement:** Authorization checks must be enforced in **route handlers / server actions / the service layer**, not solely in Next.js middleware. This addresses CVE-2025-29927 (disclosed March 2025), where middleware-only session protection in Next.js can be bypassed by spoofing the `x-middleware-subrequest` header. Middleware (`src/proxy.ts` — Next.js 16 renamed the file convention from `middleware.ts`) may be used for coarse redirects, but it is not the authorization boundary; `getCurrentUser()` (`src/lib/session.ts`) is.

**Future enhancements:** OAuth (Google, Microsoft), passkeys, MFA.

### Authorization & multi-user support (Revised in 1.2)

The application supports multiple users, but **all data is fully isolated per user — there is no sharing.**

- Each user maintains completely independent Categories, Items, Modules, and Trips.
- A Trip belongs to exactly one user; only that user may view or edit it.
- No user can see any other user's Categories, Items, Modules, Trips, Bags, or generated packing lists.
- The model supports future expansion to roles and permissions, but Version 1 has a single role (standard user) plus an administrative capability for account management only.

> **Row-level authorization requirement:** Because Prisma does not enforce ownership automatically, every query that reads or mutates user-scoped data must filter by the authenticated user's ownership. This simplifies to a straightforward `ownerId = currentUserId` predicate on every user-owned table (no share-grant logic). Ownership scoping is enforced centrally in the service layer and/or via PostgreSQL Row-Level Security so no route can return another user's data.

### Account provisioning (new in 1.2)

- **Users are admin-created.** There is no open self-service signup.
- The application supports an **administrative capability** to create users, deactivate users, and reset passwords. This may be exposed as a minimal admin UI, a CLI/management script, or both.
- **First-run bootstrap:** the deployment automatically creates the initial administrator by seeding an admin account from environment variables (`ADMIN_USERNAME` / `ADMIN_PASSWORD`) on first startup, applied only if no users exist. *(Revised in 1.7 — this now runs unattended as part of `docker compose up`, via the `migrate` service; see Deployment.)*
- **Password reset without email:** because no mail server is specified for Version 1, password reset is **admin-driven** — an administrator sets a new password (or a one-time password the user must change on next login). Self-service email-based reset is a future enhancement.

### Persistent storage

All application data is stored exclusively in PostgreSQL. Browser storage is not used for application persistence. Cookies are used only for authenticated sessions.

### Deployment (Revised in 1.7)

Deployment uses Docker Compose with three services, defined in one `docker-compose.yml` against one `Dockerfile` (two build targets — see Revision Summary 1.6 → 1.7):

- **`db`** — PostgreSQL, with a persistent named volume so upgrades and restarts never lose data.
- **`migrate`** — a one-shot container that applies pending Prisma migrations and performs first-run admin seeding, then exits. Runs automatically before `app` starts.
- **`app`** — the persistent Next.js service. Waits for `migrate` to succeed before starting.

`docker compose up` is a complete deploy or upgrade with no separate commands to run by hand — this was the explicit goal of the 1.7 revision (a compose file handed to a Docker management tool like Dockge must work standalone, with no host machine that has the project's own dependencies installed).

> **Deployment note (superseded in 1.6):** 1.1 required bundling Playwright's Chromium dependencies into the application image (the official Playwright base image alone runs ~1.5-2GB, since it bundles Chromium, Firefox, and WebKit). **1.6 removes this entirely** — there is no headless browser in the image, and no Chromium-related deployment consideration at all.

### Configuration

Environment variables, e.g.: Database Connection String, Auth Secret (`AUTH_SECRET`), Application URL, Logging Level, Timezone.

### Print / checklist rendering (Revised in 1.6)

Packing lists are rendered as a plain server-rendered page styled with `@media print` CSS — **no headless browser, no server-side PDF generation.** Supported: two-column layout, category or bag grouping, CSS-based column balancing, optional bag assignments, optional notes, and selectable themes (Standard / Compact / Large Print). The user's own browser handles printing and, optionally, "Save as PDF." See "Printable Layout — Rendering Approach."

### Logging

Configurable logging of authentication failures, validation errors, unexpected exceptions, and database failures.

### Backup strategy

Backups consist of a PostgreSQL database dump plus the Docker volume. The application supports complete restoration from these backups.

### Security

Passwords hashed with a vetted algorithm (see Authentication). Input validation on both client and server. Database access uses Prisma parameterized queries. HTTPS supported when deployed outside a trusted local network. Authorization enforced server-side (not middleware-only).

### Performance goals

Target capacity: 100+ users, 10,000+ master items, 1,000+ trips, 100+ modules, 100,000+ trip items. These volumes are comfortably within PostgreSQL's normal range and require no special optimization; the architecture supports future scaling without major redesign.

---

## Functional Requirements

> Renumbered sequentially in 1.1. Where a requirement changed meaning, the change is noted inline.

### Core data & modules

- **FR-001** — The application shall allow creation of Categories.
- **FR-002** — The application shall allow creation of Items.
- **FR-003** — Each Item shall belong to one Category.
- **FR-004** — Each Item shall define a Default Quantity.
- **FR-005** — The application shall allow creation of Modules.
- **FR-006** — A Module shall contain zero or more Items.
- **FR-007** — An Item may belong to multiple Modules.
- **FR-008** — The application shall support parent/child Item relationships.
- **FR-009** — Required child Items shall automatically be added to a Module when the parent Item is added. *(1.1: expansion is recursive and cycle-safe.)*
- **FR-010** — The application shall prevent duplicate Items within a Module.

### Trips & packing lists

- **FR-011** — The application shall allow creation of Trips.
- **FR-012** — A Trip shall be generated from one or more selected Modules.
- **FR-013** — Duplicate Items from multiple Modules shall appear only once within a Trip.
- **FR-014** — Generated Trip Items shall inherit the Item's Default Quantity.
- **FR-014a** — Each Trip Item shall be a **snapshot**: at generation it copies the source Item's name, category, notes, and default quantity. Subsequent edits to the master Item shall not alter existing Trips. *(1.2.)*
- **FR-015** — Trip Item quantities shall be independently editable.
- **FR-015a** — Increasing a Trip Item's quantity shall **not** change the quantity of any child Item. *(1.2.)*
- **FR-016** — Trip modifications shall never modify master Items.
- **FR-016a** — Users shall be able to add one or more additional Modules to an existing Trip after generation. Added Modules shall merge their expanded, deduplicated items into the Trip, skipping items already present and preserving existing packed status, quantity overrides, custom items, and bag assignments. Modules shall not be removable from a Trip. *(1.2.)*
- **FR-017** — Users shall be able to mark Items as Packed.
- **FR-018** — Users shall be able to remove Items from a specific Trip without removing them from any Module.
- **FR-018a** — Removing a parent Item (from a Module or a Trip) shall **not** remove its child Items. *(1.2.)*
- **FR-019** — Users shall be able to manually add custom Items to a Trip.
- **FR-019a** — Users shall be able to add specific existing master Items to a Trip without going through a Module, by searching and selecting them. Each selected Item brings its recursively expanded children, exactly as Module expansion would. Items already on the Trip are skipped; an Item previously removed from this Trip is restored, since selecting it by name is an explicit request for it (unlike FR-016a, where a Module merge leaves removed items removed). Only active Items are offered for selection. Also exposed as `POST /api/v1/trips/{id}/items`.
- **FR-020** — Packing Lists shall be grouped by Category and displayed according to Category sort order.

### Bags

- **FR-021** — The application shall allow creation of Bags as reusable master data shared by all of a user's Trips. *(Revised in 1.11: previously per Trip.)*
- **FR-022** — Each Trip Item may optionally be assigned to one Bag.
- **FR-022a** — Each Item may define a default Bag. When the Item is added to a Trip, the resulting Trip Item shall be assigned to that Bag. Later changes to the Item's default shall not alter existing Trips. *(1.11.)*
- **FR-023** — Users shall be able to change an item's Bag Assignment at any time.
- **FR-024** — The application shall provide a Bag View showing all packed items grouped by assigned Bag.
- **FR-025** — Packing status shall be independent of Bag Assignment.
- **FR-026** — Bag Assignments are specific to a Trip and shall not modify the master Item (including its default Bag). An inactive Bag shall remain visible on Trips that use it. *(1.11: clarified for master Bags.)*

### Pre-trip & post-trip tasks (1.12)

- **FR-059** — The application shall allow creation of Tasks, each timed as a number of days before a Trip's departure or after its return.
- **FR-060** — A Task may have sub-tasks, one level deep. A sub-task shall share its parent's departure/return anchor and may inherit its timing.
- **FR-061** — Modules may contain Tasks. Trip generation and Module merges shall add a Module's active Tasks (with their active sub-tasks) to the Trip; users may also add specific Tasks, or one-off custom Tasks, to a Trip. Trip Tasks shall be snapshots unaffected by later master edits.
- **FR-062** — The Trip page shall show a Pre-Departure checklist before the packing list and an After Return checklist after it, grouped by timeframe with due dates when the Trip has dates, and shall flag overdue tasks.
- **FR-063** — The printed checklist shall include Pre-Departure tasks before the packing list and After Return tasks after it, unless the user opts out.
- **FR-064** — The Dashboard shall list unfinished Trip Tasks that are due soon or overdue.
- **FR-065** — Master Tasks shall be importable and exportable via a Tasks CSV (`name, days, relative_to, parent, modules, notes, active`), validated as a whole before commit and upserted by name.

### Print & export

- **FR-027** — The application shall render a printable packing checklist for any Trip.
- **FR-028** — The printable checklist shall be printable directly from the browser (including "Save as PDF" via the browser's own print dialog). *(Revised in 1.6: no app-generated PDF file; see Revision Summary 1.5 → 1.6.)*
- **FR-028a** — Version 1 shall provide no bulk export of Trip-level data (Trips, Trip Items, Bags, packing status); the only Trip-level output is the browser-printed checklist, with structured Trip export deferred to the future REST API. Master data (Categories, Items, Modules) has a CSV export per FR-057. *(1.2; scope narrowed to Trip-level data in 1.4.)*
- **FR-029** — The default printable layout shall use a two-column page layout to minimize paper usage. *(1.1: CSS multi-column, not a custom height-calculation engine; 1.6: applied via `@media print` for browser printing rather than fed to a server-side renderer.)*
- **FR-030** — Items shall remain grouped by Category unless the user selects an alternate print format.
- **FR-031** — Users shall be able to optionally include Bag Assignments, Notes, and Quantities in the printed checklist.
- **FR-032** — The printed checklist shall be suitable for printing on US Letter and A4 paper sizes. *(1.6: via `@page` CSS sizing, same as any browser print job.)*
- **FR-033** — Categories shall not be split across columns unless required by page constraints. *(1.1: satisfied via `break-inside: avoid`.)*
- **FR-034** — Trip Name, Destination, and Print Date shall appear at the top of the printed document. *(Revised in 1.6 — previously specified as a consistent per-page header with app-controlled page numbering via Playwright's header/footer templates; browsers do not expose that capability for HTML-to-print. A generic, unstyled page-number/date footer is available only if the user enables it via their browser's own print-dialog options.)*
- **FR-035** — Users shall be able to select Standard, Compact, or Large Print layouts before printing.
- **FR-036** — The printed checklist shall visibly display Trip Name, Destination, and Print Date. *(Revised in 1.6 — previously specified as embedded PDF document metadata (Author, Application Version) via Playwright; with no app-generated PDF file, there is no document-properties field to set. Author/Application Version are dropped as requirements rather than faked as on-page content.)*
- **FR-037** *(Deferred)* — If a single Category spans multiple pages, the heading should repeat with a "(continued)" suffix. Deferred in 1.1 for the same reason it remains undeliverable in 1.6: neither a browser's native print engine nor headless Chromium can repeat a block heading across a page break from plain HTML/CSS. Implemented only if a real trip requires it.

### Architecture & platform

- **FR-038** — The application shall be deployable using Docker Compose.
- **FR-039** — The application shall use PostgreSQL for persistent storage.
- **FR-040** — The application shall use Prisma as its ORM.
- **FR-041** — The application shall use Next.js as the application framework.
- **FR-042** — The application shall use React for all user interface components.
- **FR-043** — The application shall use **Tailwind CSS and shadcn/ui (Radix UI)** for the user interface. *(1.1: replaces Bootstrap 5 / React-Bootstrap.)*
- **FR-044** — The application shall implement a Service Layer responsible for all business logic.
- **FR-045** — All database access shall occur through **Prisma Client, invoked from the Service Layer**. No separate repository layer is required. *(1.1: replaces the mandatory Repository Layer.)*
- **FR-046** — The user interface shall never communicate directly with the database.
- **FR-047** — Business logic shall be reusable by both the web interface and future REST APIs without duplication.
- **FR-048** — Packing list generation, deduplication, recursive child-item expansion, and quantity inheritance shall be implemented in the Service Layer.

### Authentication, authorization & operations

- **FR-049** — The application shall support multiple authenticated users using a maintained authentication framework (**Better Auth**). Custom, from-scratch session or password logic is prohibited. *(1.1; primary/alternative swapped in 1.3; implemented in 1.9.)*
- **FR-050** — Passwords shall be hashed with a vetted, salted, memory-hard algorithm (Argon2id preferred). *(1.1; implemented in 1.9 via `@node-rs/argon2`.)*
- **FR-051** — Authorization shall be enforced server-side in route handlers/service layer and shall not rely solely on Next.js middleware (CVE-2025-29927). Each user shall access **only their own data**; no data (Categories, Items, Modules, Trips, Bags, packing lists) shall be shared with or visible to any other user. *(1.2: sharing removed; 1.9: implemented — `getCurrentUser()` is the enforcement point, `src/proxy.ts` is a UX-only optimistic redirect.)*
- **FR-052** — User accounts shall be created by an administrator; the application shall not provide self-service signup. The application shall support admin-driven user creation, deactivation, and password reset, and a first-run mechanism to create the initial administrator. *(1.2; first-run bootstrap implemented in 1.9. Full admin UI — create/deactivate/reset-password for users beyond the bootstrap admin, at `/admin/users` — implemented in 1.10; see Revision Summary 1.9 → 1.10.)*
- **FR-053** — The application shall support importing master data (Categories, Items, Modules, and parent/child relationships) from a single UTF-8 CSV file with one row per Item, as defined in Data Import (CSV). *(1.2.)*
- **FR-054** — CSV import shall auto-create referenced Categories and Modules by name, upsert Items by name (merging module memberships and children on re-import), and process the file within a single transaction scoped to the importing user. *(1.2.)*
- **FR-055** — CSV import shall validate the entire file and present a row-level preview before committing, rejecting the import as a whole if any row fails validation (including unresolved child references, invalid quantities, and parent/child cycles). *(1.2.)*
- **FR-056** — The application shall support backup and restoration using PostgreSQL backup utilities and Docker volume backup. *(Both approaches documented with exact, verified commands in README's "Backup & Restore" section — `pg_dump`/`psql` for a portable logical backup, plus a raw Docker volume tar for a full byte-for-byte copy. No in-app backup feature is needed: all state lives in the `db` container's volume, and `app`/`migrate` are stateless.)*
- **FR-057** — The application shall support exporting master data (Categories, Items — including parent/child relationships and default quantities —, and Modules with membership) to the CSV format defined in Data Import & Export (CSV), for backup and migration purposes. *(1.4.)*
- **FR-058** — Users shall be able to duplicate a Trip. The duplicate shall copy the source Trip's current (non-removed) Trip Items — including custom additions, quantity overrides, and any exclusions — with item-to-bag assignments preserved. Packed status shall reset to unpacked on the duplicate; Trip dates shall not be copied. *(1.8; 1.11: Bags are master data, so assignments are copied directly rather than Bags being recreated; 1.12: Trip Tasks are copied too, unchecked.)*

---

## Use Cases

### UC-001 — Create a New Item
**Actor:** User. **Preconditions:** User is logged in.
**Flow:** Open Master Items → Add Item → enter Name, Category, Default Quantity, Notes → Save.
**Result:** The Item is available for assignment to Modules.

### UC-002 — Create a Module
**Actor:** User.
**Flow:** Open Modules → create "Cruise" → add Flip Flops, Swimsuit, Pajama Pants, Magnetic Hooks → Save.
**Result:** The Cruise module can be reused for future Trips.

### UC-003 — Add Camera Body
**Actor:** User. **Preconditions:** OM-D E-M1 Mk II has children Batteries and Charger.
**Flow:** Open Camera Module → add OM-D E-M1 Mk II.
**System response:** Automatically adds Batteries and Charger (recursively, skipping any already present).
**Result:** Camera Module contains all required equipment.

### UC-004 — Generate a Trip
**Actor:** User.
**Flow:** Create Trip "Vancouver + Alaska" → select Flight, Cruise, Camera, Alaska, World Cup → Generate.
**System response:** Collects items from all modules, expands child items, removes duplicates, copies default quantities, creates the Trip packing list.

### UC-005 — Adjust Trip Quantities
**Actor:** User.
**Flow:** Open Packing List → change Camera Batteries 2 → 4.
**Result:** Only this Trip is modified; the master Item is unchanged.

### UC-006 — Pack Items
**Actor:** User.
**Flow:** Open Packing List → check Passport, Camera, Nano Puff.
**Result:** Packing progress updates while preserving the list for future editing.

### UC-007 — Remove an Item for One Trip
**Actor:** User.
**Flow:** Generated list includes Beanie; forecast is warm; user removes Beanie.
**Result:** Beanie is excluded only from this Trip; the Alaska Module is unchanged.

### UC-008 — Assign Items to Bags
**Actor:** User.
**Flow:** Generate a Trip → items with a default Bag are already assigned (1.11) → select Passport → assign Personal Item → select Camera → assign Camera Backpack → repeat for the rest.
**Result:** The user can determine which bag contains any packed item.

### UC-009 — View Packing by Bag
**Actor:** User.
**Flow:** Open the Packing List → switch to Bag View.
**System response:** Items are grouped by assigned bag.
**Result:** The user can verify bag contents before or during travel.

### UC-010 — Print Packing Checklist
**Actor:** User.
**Flow:** Open a Trip → Print Checklist → choose options → browser Print dialog opens → print or "Save as PDF".
**System response:** The print route renders a two-column checklist styled with `@media print` CSS; `window.print()` opens the browser's native print dialog.
**Result:** A printer-friendly checklist suitable for manual use, with PDF saving handled by the browser if wanted. *(Revised in 1.6 — no server-side PDF generation.)*

### UC-011 — Print Bag-Specific Checklist
**Actor:** User.
**Flow:** Open a Trip → Print by Bag → Print dialog opens.
**System response:** Items are grouped by assigned bag, reusing the same grouping as Bag View.
**Result:** The user can pack one bag at a time from the printed checklist.

### UC-012 — Generate a Balanced Printable Checklist
**Actor:** User.
**Flow:** Open a Trip → Print Checklist → Standard layout → Print dialog opens.
**System response:** Groups items by category; CSS multi-column layout distributes categories across two columns and avoids splitting them; the browser renders and paginates the print output.
**Result:** A clean, balanced, printer-friendly checklist with minimal wasted space.

### UC-013 — Print a Large Packing List
**Actor:** User. **Scenario:** A Trip contains 300+ items.
**System response:** The browser paginates automatically and continues categories across pages only when necessary.
**Result:** Even very large lists remain readable and easy to pack from. *(Repeated "(continued)" category headings and app-controlled page numbers are deferred/unavailable per FR-034/FR-037.)*

### UC-014 — Deploy the Application
**Actor:** Administrator.
**Flow:** Install Docker and Docker Compose → clone the repository (or just copy `docker-compose.yml`) → configure environment variables (including initial `ADMIN_USERNAME` / `ADMIN_PASSWORD`) → `docker compose up -d`.
**System response:** The `migrate` service applies the database schema and, on first startup with no existing users, seeds the initial administrator account from the provided environment variables — automatically, before `app` starts (1.7). No separate commands are run by the administrator.
**Result:** The application and PostgreSQL are deployed with persistent storage and an administrator account ready for use.

### UC-015 — Authenticate User (Implemented in 1.9)
**Actor:** User.
**Flow:** Open the application → redirected to `/login` (no session cookie) → enter username and password → Better Auth validates the credentials server-side, against the Argon2id hash in `Account.password` → session cookie set → Dashboard loads.
**Result:** The user has access only to their own resources. Verified: correct credentials issue a session and unlock every page; incorrect credentials return 401; a direct `POST` to the sign-up endpoint is rejected regardless of a UI existing for it.

### UC-015a — Administer Users (Implemented in 1.9/1.10)
**Actor:** Administrator.
**Flow (first-run bootstrap, 1.9):** Deploy with `ADMIN_USERNAME`/`ADMIN_PASSWORD` set → the `migrate` container's seed step creates the initial admin (User + credential Account row) if no users exist yet.
**Flow (ongoing admin UI, 1.10):** `/admin/users` → create a new user with username, initial password, and optional admin flag; or toggle an existing user active/inactive; or set a new password for any user.
**Result:** The new user can log in; each user's data remains fully isolated from every other user's. A deactivated user is rejected at their next sign-in attempt (clean 403) and, if already signed in, loses access on their very next request — not just blocked from future logins. An admin cannot deactivate their own account. Verified against a real Postgres instance and a fully containerized deploy: create/deactivate/reactivate/reset-password, the self-deactivation guard, and both deactivation-enforcement paths (new sign-in blocked, existing session cut off) all behave correctly.

### UC-016a — Add a Module to an Existing Trip
**Actor:** User. **Scenario:** A user forgot to include the "Camera" Module when generating a Trip (or the Module did not exist yet).
**Flow:** Open the Trip → Add Module → select "Camera" → confirm.
**System response:** `TripService` expands and deduplicates the Module's items and merges any not already present into the Trip, leaving existing packed status, quantity overrides, custom items, and bag assignments untouched.
**Result:** The Trip gains the missing items without losing prior packing progress.

### UC-016b — Add Specific Items to a Trip
**Actor:** User. **Scenario:** A user knows exactly which camera bag and which camera body they're taking, and doesn't want to merge a whole Module only to delete most of it.
**Flow:** Open the Trip → "Add items from your master list" → search → tick "Think Tank Perception Pro" and "Olympus OM-D EM-1 MkII" → Add.
**System response:** `TripService.addItemsToTrip` adds both Items plus the camera's recursively expanded children (batteries, charger, the charger's cable), skipping any already on the Trip and restoring any previously removed from it (FR-019a).
**Result:** The Trip gains exactly the chosen items and their required accessories.

### UC-018 — Import an Existing List from CSV
**Actor:** User. **Scenario:** The user has an existing packing spreadsheet and wants to seed the application.
**Flow:** Export the spreadsheet to the Items CSV format → Settings → CSV Import → upload the file → review the validation preview → confirm.
**System response:** `ImportService` validates all rows; on success it upserts Items, auto-creates referenced Categories and Modules, wires parent/child relationships, and enforces the module child invariant, all in one transaction scoped to the user.
**Result:** The user's Categories, Items, and Modules are populated and ready to build Trips from, without any Trip or Bag data being created.

### UC-016 — Generate a Packing List Through the Service Layer
**Actor:** User.
**Flow:** Create a Trip → select Modules → Generate Packing List → Route Handler invokes `TripService` → `TripService` reads module items via Prisma → child items expanded (recursive) → duplicates removed → default quantities applied → Trip Items saved to PostgreSQL → list displayed.
**Result:** A complete, deduplicated packing list generated by reusable business logic.

### UC-017 — Future REST API Consumption
**Actor:** External Application.
**Flow:** Client calls `POST /api/trips/{id}/generate` → Route Handler validates and authorizes the request → invokes `TripService.generatePackingList()` → the same business logic runs → the packing list is returned as JSON.
**Result:** REST API and web application share identical business rules and consistent behavior.

### UC-019 — Export Master Data to CSV
**Actor:** User. **Scenario:** The user wants an offline backup, or wants to bulk-edit their catalog in a spreadsheet and re-import it.
**Flow:** Settings → CSV Export → download.
**System response:** `ExportService` reads the user's Categories, Items (with parent/child links), and Modules (with membership) and writes them to the same one-row-per-Item CSV shape used for import.
**Result:** A CSV file suitable for backup, offline editing, or migrating master data to another instance; re-importing it unchanged is a no-op.

### UC-020 — Duplicate a Trip
**Actor:** User. **Scenario:** The user is planning a trip similar to one they've taken before and wants to start from what they actually packed last time, not regenerate from scratch.
**Flow:** Trip History (or the Trip detail page) → Duplicate → confirm/edit the new trip's name, destination, and dates → Create duplicate.
**System response:** `TripService.duplicateTrip` copies the source Trip's current Trip Items (custom additions, quantity overrides, and exclusions all preserved) with bag assignments intact (1.11: Bags are shared master data, not recreated), into a new Trip with packed status reset.
**Result:** A new Trip ready to pack from, without losing the customization built up on the original.

### UC-021 — Work Through a Pre-Departure Checklist
**Actor:** User. **Scenario:** A dive trip leaves in a week; the user wants to know what to do and when.
**Flow:** Create the Trip with start/end dates and the "Every Trip", "Pets", and "Scuba Diving" Modules → the Trip page opens with a Pre-Departure checklist (e.g. "4 Weeks Before Departure: Test all Dive Gear", "Day Before Departure: Pets → Clean Litter Box, Board Dog") → check tasks off as they're done; the Dashboard's Due Soon lists what's due this week or overdue.
**System response:** `TripService.generatePackingList` snapshots the Modules' Items and Tasks; due dates come from the Trip's dates (FR-059–FR-064).
**Result:** Nothing time-sensitive is forgotten, and the printed checklist starts with the Pre-Departure tasks.

---

## Future Enhancements

**General:** Weight tracking per item and per bag; suitcase assignment weight totals; barcode/QR inventory; weather-based recommendations; cloud sync; mobile offline mode; printable checklist refinements; AI recommendations based on destination, season, and itinerary; **comparing two Trips' packing lists side by side** (named in the original Trip History concept but deferred in 1.8 pending a clearer spec of what "compare" should show).

**Bags:** Automatic estimated bag weight from item weights; remaining-weight indicator before airline limits; warnings when restricted items (e.g., lithium batteries) are assigned to checked luggage; drag-and-drop between bags; duplicate bag templates.

**Print:** Repeated "(continued)" category headings for oversized categories (FR-037).

**Auth:** OAuth (Google, Microsoft), passkeys, MFA; roles and permissions; self-service email-based password reset (requires a configured mail server).

**Explicitly out of scope for Version 1 (1.2):** Trip sharing and collaborative packing between users. The data model is single-owner; introducing sharing later would require adding share-grant tables and revising the authorization predicate, and should be treated as a significant future change rather than a drop-in feature.

