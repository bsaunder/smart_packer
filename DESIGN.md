# Smart Packing Planner — Design & Requirements Document

**Version:** 1.4
**Supersedes:** 1.3, 1.2, 1.1, 1.0

---

## Revision Summary (1.3 → 1.4)

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
- **Trip History:** Duplicate trip, review packing list, compare trips.
- **Settings:** Theme, Backup, CSV Import & Export of master data (see Data Import & Export). *(Trip-level export in Version 1 is limited to PDF checklists; structured Trip export is deferred to the future REST API.)*

---

## Suitcase Assignment

Each Trip Item may optionally be assigned to a specific bag. Bag assignments are specific to a Trip and do not modify the master Item.

**Bags per Trip** (e.g., Checked Suitcase, Carry-on, Camera Backpack, Personal Item, Day Pack, Dry Bag) have properties: Name, Bag Type, Color (optional), Weight Limit (optional), Current Weight (future).

**Packing workflow:** mark an item packed, assign it to a bag, move it between bags. Packing status is independent of bag assignment.

**Views:** Standard (grouped by Category) and Bag View (grouped by Bag). **Filters:** All / Packed / Unpacked / Bag / Category.

---

## Print & Export

Users can generate a printer-friendly packing checklist from any Trip, exportable as PDF for printing, sharing, or archival. The format minimizes paper use while remaining easy to read and check off by hand.

**Default layout:** two evenly sized columns. Each page contains Trip Name, Destination, Travel Dates, Print Date, category headings, a checkbox beside every item, and quantity per item.

**Print options:** include categories / quantities / notes / bag assignments / packed status; print only unpacked or all items; color or grayscale.

**Optional formats:** Standard (default), Compact (smaller font, reduced spacing), By Bag (grouped by assigned bag), Blank Checklist (unchecked copy for reuse).

**PDF metadata:** Trip Name, Destination, Author, Creation Date, Application Version.

> **Data export scope (Revised in 1.4):** Trip-level export remains PDF-only — there is no bulk export of Trip/Trip Item/Bag/packing-status data, and none is planned short of the future REST API. **Master data** (Categories, Items, Modules), however, now has a CSV export mirroring the import format — see "Data Import & Export (CSV)".

---

## Data Import & Export (CSV) (Import: new in 1.2; Export: new in 1.4)

Version 1 supports **CSV import and export** of the reusable master data — **Categories, Items (with parent/child relationships), and Modules (with membership)**. Import lets users migrate an existing packing list (typically a spreadsheet) into the application; export produces the same shape back out, so the two round-trip (export → edit offline → re-import, safe because import upserts by name). Trips and Bags are *not* imported or exported via CSV in either direction; Trips are generated from Modules and Bags are created per Trip — both remain runtime data.

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
- **Every Item — including every child — must appear as its own row.** A `children` reference to a name that has no row of its own is a validation error; the importer never silently invents an item with no category. (Modules, by contrast, are just names and are auto-created.)
- **Parent/child invariant enforced after wiring.** For consistency with FR-009, once relationships are wired, any child of a parent that belongs to a Module is ensured to also belong to that Module. Child quantities are the child's own `default_quantity` and are never derived from the parent (per FR-015a).
- **Validation & preview.** The importer validates the whole file and presents a row-level report (errors and a summary of what will be created/updated) **before** committing. Detected problems include: missing `name` or `category`, non-integer or non-positive `default_quantity`, an unresolved `children` reference, an Item listed as its own child, and any parent/child **cycle**. If any row fails validation, the import is rejected as a whole (all-or-nothing).

### Export (New in 1.4)

- **Same shape as import.** Export produces one row per Item, with the identical `name,category,default_quantity,notes,active,modules,children` columns, RFC 4180 quoting, and pipe-delimited multi-value cells. A file exported from the app and re-imported unchanged is a no-op update (every field matches what's already there).
- **Scope: all of the user's Items**, active and inactive, regardless of Module or Trip usage. `category` is the Category name; `modules` lists every Module the Item currently belongs to; `children` lists the Item's direct children by name (one level — a grandchild appears on its own parent's row, not repeated on the ancestor's row, matching how import interprets `children`).
- **Not exported.** Category display order and Module-level metadata beyond membership are not separately represented in this format (Categories/Modules only exist in the export as names referenced from Item rows, same as on import). Trips, Trip Items, Bags, packing status, and per-trip overrides are never exported — see "Not imported/exported" below.
- **Delivery.** A direct file download from Settings (`GET`, `Content-Type: text/csv`, `Content-Disposition: attachment`) — no background job or email delivery for Version 1.

### Not imported/exported

Trips, Trip Items, Bags, packing status, and per-trip overrides are never imported or exported via CSV — they are runtime data generated from the master data above. The only Trip-level output is the PDF checklist (see Print & Export).

---

## Printable Layout — Rendering Approach (Revised in 1.1)

Version 1.0 specified a custom layout engine that measures the rendered height of each category and distributes categories across columns. **In 1.1 this is delegated to the browser's layout engine.** The checklist is rendered as HTML/CSS and printed to PDF by headless Chromium (Playwright). This satisfies the two-column, minimal-paper, and no-split requirements with standard CSS rather than a hand-written height calculator.

### Column layout

The two-column paper-saving layout is produced with CSS multi-column:

```css
@page { size: Letter; margin: 1.4cm 1.2cm; }   /* A4 selectable via option */
.checklist { column-count: 2; column-gap: 1.4cm; column-fill: auto; }
.category  { break-inside: avoid; }            /* never split a category */
```

- `column-fill: auto` fills the first column before spilling into the second, minimizing page count (best paper saving). `column-fill: balance` is a one-line alternative if evenly balanced columns are preferred over tight packing.
- `break-inside: avoid` on each category block keeps categories intact across column and page boundaries.

### Headers, footers, page numbering

Page headers/footers ("Page 2 of 5", trip name, date) are produced by Playwright's `page.pdf()` `headerTemplate` / `footerTemplate` using its built-in `pageNumber`, `totalPages`, `title`, and `date` classes — configuration, not custom code.

### Category continuation ("continued" heading)

The repeated **"Clothing (continued)"** heading when a single category overflows a page is **deferred**. CSS/Chromium cannot repeat a block heading natively. For 1.1, an oversized category may break without a repeated heading. The measure-and-pre-split logic required to repeat the heading is implemented only if a real trip hits the case (the 300-item stress scenario), and it is the piece most safely postponed.

### Why this approach

Every print option — notes, bag assignments, grayscale, unpacked-only, compact/large themes, and Bag View — becomes a template conditional or CSS class rather than engine work. Bag View is the same template fed data grouped by bag instead of category; grouping happens in the service layer, and the renderer stays presentation-only.

### Trade-off noted

`@react-pdf/renderer` was considered as a no-Chromium alternative (lighter image, no browser process) but has no multi-column support, which would require re-implementing the exact column-balancing algorithm and every print option in a non-CSS styling model. Because the target is self-hosted deployment on capable hardware where image size and occasional Chromium invocation are non-issues, Playwright is preferred. `@react-pdf/renderer` remains a fallback if bundling Chromium becomes a deployment problem.

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
- **PackingListService:** mark packed, update trip quantities, remove items from a trip, assign items to bags, filter and sort/group packing lists (including grouping for Bag View and PDF).
- **PdfExportService:** render trip data to HTML, invoke Playwright to produce PDF, apply layout/theme options and metadata.
- **BagService:** create bags for trips, assign items to bags, move items between bags.
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

**Backend:** implemented within the Next.js application — authentication, route handlers, business logic, PDF generation, data validation.

**Service layer:** dedicated, reusable by React UI, route handlers, future REST APIs, background jobs, and future mobile apps. The UI never talks to the database directly.

**Data access:** **Prisma Client, called directly from services.** No separate repository layer (see Service Layer section).

**Database:** PostgreSQL, accessed exclusively through Prisma. Prisma provides strong typing, migrations, relationship management, query generation, and transactions. All persistent data resides in PostgreSQL.

### Authentication (Revised in 1.3)

Version 1.0 specified hand-implemented username/password authentication. **In 1.1, authentication was delegated to a maintained framework (Auth.js v5 primary). In 1.3, the primary choice is revised to Better Auth**, based on ecosystem status as of implementation time (August 2026).

- **Primary choice: Better Auth.** Rationale: TypeScript-first, self-hosted, owns its schema (clean fit with the Prisma-managed core schema and admin-provisioned/no-signup model), and is the option the wider ecosystem — including Auth.js's own maintainers — now steers new projects toward. Version 1 uses its Credentials-style email/username + password flow.
- **Acceptable alternative: Auth.js (NextAuth v5).** Still production-usable and has the most mature Prisma adapter, but remains beta-labeled well into 2026 with new development effort concentrated on Better Auth. Reasonable to choose only when migrating an existing Auth.js codebase, not for a greenfield build.
- **Lucia is explicitly excluded** — it was deprecated in March 2025 and is now a learning resource, not a maintained dependency.

**Password handling:** passwords are hashed with a modern, salted, memory-hard algorithm (Argon2id preferred; bcrypt acceptable). The application never stores plaintext passwords and never implements its own password hashing scheme beyond calling a vetted library.

**Session protection — security requirement:** Authorization checks must be enforced in **route handlers / server actions / the service layer**, not solely in Next.js middleware. This addresses CVE-2025-29927 (disclosed March 2025), where middleware-only session protection in Next.js can be bypassed by spoofing the `x-middleware-subrequest` header. Middleware may be used for coarse redirects, but it is not the authorization boundary.

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
- **First-run bootstrap:** the deployment must provide a way to create the initial administrator — for example, seeding an admin account from environment variables (`ADMIN_USERNAME` / `ADMIN_PASSWORD`) on first startup, applied only if no users exist.
- **Password reset without email:** because no mail server is specified for Version 1, password reset is **admin-driven** — an administrator sets a new password (or a one-time password the user must change on next login). Self-service email-based reset is a future enhancement.

### Persistent storage

All application data is stored exclusively in PostgreSQL. Browser storage is not used for application persistence. Cookies are used only for authenticated sessions.

### Deployment

Deployment uses Docker Compose. Required containers: Smart Packing Planner and PostgreSQL. Persistent Docker volumes store PostgreSQL data, and application upgrades do not affect stored user data.

> **Deployment note (new in 1.1):** The application image must include the Chromium dependencies Playwright requires for PDF generation (system libraries), or use Playwright's official base image. This is the main image-size consequence of the PDF approach and is acceptable for self-hosted deployment.

### Configuration

Environment variables, e.g.: Database Connection String, Auth Secret (`AUTH_SECRET`), Application URL, Logging Level, Timezone.

### PDF generation

Packing lists are rendered from HTML/CSS and generated **server-side via headless Chromium (Playwright)**. Supported: two-column layout, category grouping, CSS-based column balancing, headers, footers, page numbering, optional bag assignments, optional notes, and selectable themes (Standard / Compact / Large Print). A pooled/reused browser instance is used since PDF generation is occasional rather than a hot path.

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
- **FR-020** — Packing Lists shall be grouped by Category and displayed according to Category sort order.

### Bags

- **FR-021** — The application shall allow creation of Bags for each Trip.
- **FR-022** — Each Trip Item may optionally be assigned to one Bag.
- **FR-023** — Users shall be able to change an item's Bag Assignment at any time.
- **FR-024** — The application shall provide a Bag View showing all packed items grouped by assigned Bag.
- **FR-025** — Packing status shall be independent of Bag Assignment.
- **FR-026** — Bag Assignments are specific to a Trip and shall not modify the master Item.

### Print & export

- **FR-027** — The application shall generate a printable packing checklist for any Trip.
- **FR-028** — The printable checklist shall support export to PDF.
- **FR-028a** — Version 1 shall provide no bulk export of Trip-level data (Trips, Trip Items, Bags, packing status); the only Trip-level export is the PDF checklist, with structured Trip export deferred to the future REST API. Master data (Categories, Items, Modules) has a CSV export per FR-057. *(1.2; scope narrowed to Trip-level data in 1.4.)*
- **FR-029** — The default printable layout shall use a two-column page layout to minimize paper usage. *(1.1: implemented with CSS multi-column, not a custom height-calculation engine.)*
- **FR-030** — Items shall remain grouped by Category unless the user selects an alternate print format.
- **FR-031** — Users shall be able to optionally include Bag Assignments, Notes, and Quantities in the printed checklist.
- **FR-032** — The generated PDF shall be suitable for printing on US Letter and A4 paper sizes.
- **FR-033** — Categories shall not be split across columns unless required by page constraints. *(1.1: satisfied via `break-inside: avoid`.)*
- **FR-034** — Each printed page shall contain a consistent header and page numbering. *(1.1: via Playwright header/footer templates.)*
- **FR-035** — Users shall be able to select Standard, Compact, or Large Print layouts before PDF generation.
- **FR-036** — Generated PDFs shall include metadata: Trip Name, Destination, Author, Creation Date, Application Version.
- **FR-037** *(Deferred)* — If a single Category spans multiple pages, the heading should repeat with a "(continued)" suffix. Deferred in 1.1; implemented only if a real trip requires it.

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

- **FR-049** — The application shall support multiple authenticated users using a maintained authentication framework (**Better Auth**, or Auth.js / NextAuth v5). Custom, from-scratch session or password logic is prohibited. *(1.1; primary/alternative swapped in 1.3.)*
- **FR-050** — Passwords shall be hashed with a vetted, salted, memory-hard algorithm (Argon2id preferred). *(1.1.)*
- **FR-051** — Authorization shall be enforced server-side in route handlers/service layer and shall not rely solely on Next.js middleware (CVE-2025-29927). Each user shall access **only their own data**; no data (Categories, Items, Modules, Trips, Bags, packing lists) shall be shared with or visible to any other user. *(1.2: sharing removed.)*
- **FR-052** — User accounts shall be created by an administrator; the application shall not provide self-service signup. The application shall support admin-driven user creation, deactivation, and password reset, and a first-run mechanism to create the initial administrator. *(1.2.)*
- **FR-053** — The application shall support importing master data (Categories, Items, Modules, and parent/child relationships) from a single UTF-8 CSV file with one row per Item, as defined in Data Import (CSV). *(1.2.)*
- **FR-054** — CSV import shall auto-create referenced Categories and Modules by name, upsert Items by name (merging module memberships and children on re-import), and process the file within a single transaction scoped to the importing user. *(1.2.)*
- **FR-055** — CSV import shall validate the entire file and present a row-level preview before committing, rejecting the import as a whole if any row fails validation (including unresolved child references, invalid quantities, and parent/child cycles). *(1.2.)*
- **FR-056** — The application shall support backup and restoration using PostgreSQL backup utilities and Docker volume backup.
- **FR-057** — The application shall support exporting master data (Categories, Items — including parent/child relationships and default quantities —, and Modules with membership) to the CSV format defined in Data Import & Export (CSV), for backup and migration purposes. *(1.4.)*

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
**Flow:** Generate a Trip → select Passport → assign Personal Item → select Camera → assign Camera Backpack → repeat.
**Result:** The user can determine which bag contains any packed item.

### UC-009 — View Packing by Bag
**Actor:** User.
**Flow:** Open the Packing List → switch to Bag View.
**System response:** Items are grouped by assigned bag.
**Result:** The user can verify bag contents before or during travel.

### UC-010 — Print Packing Checklist
**Actor:** User.
**Flow:** Open a Trip → Print Checklist → choose options → Generate PDF → print or save.
**System response:** Service renders HTML, Playwright produces a two-column PDF with headers and page numbers.
**Result:** A printer-friendly checklist suitable for manual use.

### UC-011 — Print Bag-Specific Checklist
**Actor:** User.
**Flow:** Open a Trip → Print by Bag → Generate PDF.
**System response:** Items are grouped by assigned bag.
**Result:** The user can pack one bag at a time from the printed checklist.

### UC-012 — Generate a Balanced Printable Checklist
**Actor:** User.
**Flow:** Open a Trip → Print Checklist → Standard layout → Generate PDF.
**System response:** Groups items by category; CSS multi-column layout distributes categories across two columns and avoids splitting them; Playwright renders the PDF.
**Result:** A clean, balanced, printer-friendly checklist with minimal wasted space.

### UC-013 — Print a Large Packing List
**Actor:** User. **Scenario:** A Trip contains 300+ items.
**System response:** Chromium paginates automatically, continues categories across pages only when necessary, and repeats headers and page numbers.
**Result:** Even very large lists remain readable and easy to pack from. *(Repeated "(continued)" category headings are deferred per FR-037.)*

### UC-014 — Deploy the Application
**Actor:** Administrator.
**Flow:** Install Docker and Docker Compose → clone the repository → configure environment variables (including initial `ADMIN_USERNAME` / `ADMIN_PASSWORD`) → `docker compose up -d`.
**System response:** On first startup with no existing users, the application seeds the initial administrator account from the provided environment variables.
**Result:** The application and PostgreSQL are deployed with persistent storage and an administrator account ready for use.

### UC-015 — Authenticate User
**Actor:** User.
**Flow:** Open the application → enter username and password → Auth.js validates the credentials (server-side) → Dashboard loads.
**Result:** The user has access only to their own resources.

### UC-015a — Administer Users
**Actor:** Administrator.
**Flow:** Open user administration → create a new user with username and initial password (or deactivate an existing user, or reset a user's password).
**Result:** The new user can log in; each user's data remains fully isolated from every other user's.

### UC-016a — Add a Module to an Existing Trip
**Actor:** User. **Scenario:** A user forgot to include the "Camera" Module when generating a Trip (or the Module did not exist yet).
**Flow:** Open the Trip → Add Module → select "Camera" → confirm.
**System response:** `TripService` expands and deduplicates the Module's items and merges any not already present into the Trip, leaving existing packed status, quantity overrides, custom items, and bag assignments untouched.
**Result:** The Trip gains the missing items without losing prior packing progress.

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

---

## Future Enhancements

**General:** Weight tracking per item and per bag; suitcase assignment weight totals; barcode/QR inventory; weather-based recommendations; cloud sync; mobile offline mode; printable checklist refinements; AI recommendations based on destination, season, and itinerary.

**Bags:** Automatic estimated bag weight from item weights; remaining-weight indicator before airline limits; warnings when restricted items (e.g., lithium batteries) are assigned to checked luggage; drag-and-drop between bags; duplicate bag templates.

**Print:** Repeated "(continued)" category headings for oversized categories (FR-037).

**Auth:** OAuth (Google, Microsoft), passkeys, MFA; roles and permissions; self-service email-based password reset (requires a configured mail server).

**Explicitly out of scope for Version 1 (1.2):** Trip sharing and collaborative packing between users. The data model is single-owner; introducing sharing later would require adding share-grant tables and revising the authorization predicate, and should be treated as a significant future change rather than a drop-in feature.

