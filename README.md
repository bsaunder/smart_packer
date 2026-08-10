# Smart Packing Planner

Smart Packing List Generator. See [DESIGN.md](./DESIGN.md) for the full design and requirements document.

## Getting Started

Requires Node 22+ and pnpm.

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

Built with [Next.js](https://nextjs.org) (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma, and PostgreSQL. See DESIGN.md for the full architecture.

## CSV Import & Export

Master data — Categories, Items (including parent/child relationships and default quantities), and Modules (including membership) — can be imported and exported as a single CSV file from **Settings**. Trips, Trip Items, and Bags are never part of this file; they're runtime data generated from master data, not migrated directly. A ready-to-use example is at [samples/items-sample.csv](./samples/items-sample.csv) — download it from Settings to try import, or use it as-is to seed a fresh database.

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
| `children` | No | Pipe-delimited **Item names** that are children of this Item (parent → children). Every child must have its own row in the same file — a reference to a name with no row is a validation error. |

### Import semantics

- **Upsert by name.** Re-importing is safe and additive: an existing Item's scalar fields are updated, and its module memberships and children are **merged** (union), never replaced or removed.
- **Validated before anything is written.** The whole file is checked first — missing `name`/`category`, a non-positive `default_quantity`, an item listed as its own child, an unresolved child reference, or a parent/child **cycle** (checked against the file *and* your existing data) — and the import is rejected as a whole if any row fails. You'll see a row-by-row error list and a create/update summary before confirming.
- **Module-child invariant.** If a parent belongs to a Module, its children are ensured to belong to that Module too, even across multi-level chains.

### Export

Downloads the exact same shape for every Item you own (active and inactive). Round-tripping is lossless: exporting and immediately re-importing the same file validates cleanly and updates everything in place with no new rows.
