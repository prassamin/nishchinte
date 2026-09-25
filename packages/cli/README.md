# @nishchinte/cli

Unified developer command-line interface (CLI) for the **Nishchinte** e-commerce ecosystem. It wraps Prisma CLI tools, configuration loaders, database migration runners, and project management workflows with automatic database adapter detection and schema orchestration.

---

## Features

- **Automatic Schema Resolution**: Discovers Prisma schemas across the workspace without hardcoded paths.
- **Config Integration**: Reads database credentials and configuration automatically from `nishchinte.config.ts`.
- **Database Lifecycle Management**: Push, pull, seed, generate, and open Prisma Studio with single unified commands.
- **Migration Workflows**: Full migration suite including dev migrations, deployments, resets, status checks, and resolution.
- **Direct Passthrough**: Safely forwards options and unknown flags to underlying Prisma engines.

---

## Installation

Within the monorepo workspace:

```json
{
  "dependencies": {
    "@nishchinte/cli": "workspace:*"
  }
}
```

The CLI registers the binary executable `nishchinte`.

---

## Usage

Run commands using your package manager (e.g. `pnpm`, `bun`, `npm`, or `yarn`):

```bash
# Display help and version
pnpm nishchinte --help
pnpm nishchinte --version
```

---

## Command Reference

### Database & Schema Commands (`nishchinte prisma db`)

| Command | Description | Flags |
| :--- | :--- | :--- |
| `nishchinte prisma db push` | Push Prisma schema state directly to the database without creating migrations. | `--accept-data-loss`, `--force-reset` |
| `nishchinte prisma db pull` | Introspect database state into the Prisma schema. | `--force` |
| `nishchinte prisma db seed` | Run database seed script configured in the project. | — |

```bash
# Push schema changes quickly during development
pnpm nishchinte prisma db push

# Force push with reset
pnpm nishchinte prisma db push --force-reset --accept-data-loss
```

---

### Migration Commands (`nishchinte prisma migrate`)

| Command | Description | Flags |
| :--- | :--- | :--- |
| `nishchinte prisma migrate dev` | Create and apply a migration from schema changes during development. | `-n, --name <name>`, `--create-only` |
| `nishchinte prisma migrate deploy` | Apply all pending migrations in staging/production environments. | — |
| `nishchinte prisma migrate reset` | Reset the database and re-apply all migrations from scratch. | `-f, --force` |
| `nishchinte prisma migrate status` | Check whether migrations are up-to-date. | — |
| `nishchinte prisma migrate resolve` | Mark failed migrations as applied or rolled back. | `--applied <name>`, `--rolled-back <name>` |

```bash
# Create a new named migration
pnpm nishchinte prisma migrate dev -n add_product_variants

# Apply migrations in production
pnpm nishchinte prisma migrate deploy
```

---

### Artifacts & Tools (`nishchinte prisma`)

| Command | Description |
| :--- | :--- |
| `nishchinte prisma generate` | Generate Prisma Client artifacts and TypeScript types. |
| `nishchinte prisma studio` | Launch the Prisma Studio web UI for browsing and editing database records. |

```bash
# Generate Prisma Client
pnpm nishchinte prisma generate

# Launch Prisma Studio UI
pnpm nishchinte prisma studio
```

---

## Architecture & How It Works

1. **Config Loader**: Loads the root `nishchinte.config.ts` via `@nishchinte/config` to resolve database connection URLs, provider types (PostgreSQL, MariaDB, MySQL), and project paths.
2. **Schema Engine**: Executes Prisma operations targeting the canonical database package `@nishchinte/db`.
3. **Driver Compatibility**: Coordinates with database drivers and adapters configured in the workspace.

---

## Related Packages

- [`@nishchinte/config`](file:///mnt/workspace/Git/ecom/packages/config/README.md) - Platform configuration definition and loader.
- [`@nishchinte/db`](file:///mnt/workspace/Git/ecom/packages/db/README.md) - Database schema, Prisma client singleton, and MariaDB/MySQL adapter.
