# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

data-peek is a minimal, fast, lightweight PostgreSQL client desktop application built with Electron, React, and TypeScript. Core philosophy: Simple over feature-rich, keyboard-first, fast to open and query.

## Commands

```bash
# Development (from root)
pnpm dev                 # Start desktop app with hot reload
pnpm lint                # Lint all workspaces
pnpm build               # Build for current platform

# From apps/desktop
pnpm format              # Format with Prettier
pnpm typecheck           # Full TypeScript check (node + web)
pnpm typecheck:node      # Check Electron main/preload only
pnpm typecheck:web       # Check React frontend only

# Platform builds
pnpm --filter @data-peek/desktop build:mac
pnpm --filter @data-peek/desktop build:win
pnpm --filter @data-peek/desktop build:linux
```

## Architecture

### Monorepo Structure (pnpm workspaces)
```
apps/desktop/           # Electron desktop application
packages/shared/        # Shared types for IPC communication
docs/                   # Scope document and roadmap
```

### Desktop App Layers
```
src/main/               # Electron main process (Node.js)
  index.ts              # IPC handlers, DB connections, query execution
  sql-builder.ts        # SQL generation for edit operations

src/preload/            # IPC bridge (context isolation)
  index.ts              # Exposes window.api to renderer

src/renderer/src/       # React frontend
  components/           # UI components
  stores/               # Zustand state management
  lib/                  # Utilities (export, SQL formatting)
  router.tsx            # TanStack Router
```

### IPC Contract

The preload script exposes `window.api`:
```typescript
window.api.connections.{list, add, update, delete}
window.api.db.{connect, query, schemas, execute, previewSql, explain}
```

All IPC types are defined in `packages/shared/src/index.ts`.

### State Management

Zustand stores in `src/renderer/src/stores/`:
- `connection-store.ts` - Active connection, available connections, schema cache
- `query-store.ts` - Query history, execution history
- `tab-store.ts` - Multiple editor tabs
- `edit-store.ts` - Pending inline edits (insert/update/delete)

## Tech Stack

- **Desktop**: Electron + electron-vite
- **Frontend**: React 19, TanStack Router, TanStack Table
- **UI**: shadcn/ui + Tailwind CSS 4
- **State**: Zustand
- **Editor**: Monaco
- **Database**: pg (PostgreSQL driver), better-sqlite3 (local storage)
- **Visualization**: @xyflow/react (ERD diagrams)

## Code Style

- Prettier: single quotes, no semicolons, 100 char width, no trailing commas
- TypeScript strict mode with path aliases:
  - `@/*` → renderer source
  - `@shared/*` → shared package

## Key Patterns

1. **IPC Communication**: All database operations go through IPC handlers in main process. Never import `pg` in renderer.

2. **Type Safety**: Shared types in `packages/shared` ensure IPC contract consistency between main and renderer.

3. **SQL Generation**: `sql-builder.ts` generates database-agnostic SQL for edit operations (INSERT/UPDATE/DELETE).

4. **Schema Caching**: Schema info is fetched once per connection and stored in Zustand.
