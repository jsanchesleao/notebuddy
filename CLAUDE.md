# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Notebuddy is a private, offline-first note-taking PWA (React + TypeScript + Vite), statically hosted on GitHub Pages with no backend. See `pitch.md` (vision), `spec.md` (technical/functional spec — data model, architecture, encryption, sync design), and `roadmap.md` (phased implementation plan) for full context before making architectural decisions. The codebase currently implements roughly Phase 0/1 of the roadmap: app shell, theming, routing, and Dexie/Yjs-backed CRUD for folders/notebooks/boards/notes. Later-phase concepts described in `spec.md` (block editor, search, encryption, sync) are designed but not yet built — don't assume they exist without checking `src/`.

## Commands

Package manager is **pnpm** (see `pnpm-workspace.yaml`).

- `pnpm dev` — start Vite dev server
- `pnpm build` — typecheck (`tsc -b`) then production build
- `pnpm typecheck` — `tsc -b --noEmit` only
- `pnpm test` — run the full Vitest suite once (`vitest run`)
- `pnpm test -- path/to/file.test.ts` — run a single test file
- `pnpm test -- -t "test name"` — filter by test name
- `pnpm lint` — ESLint over the whole repo
- `pnpm format` / `pnpm format:check` — Prettier write/check

CI (`.github/workflows/deploy.yml`) only runs `pnpm install --frozen-lockfile && pnpm build` on push to `main` and deploys `dist/` to GitHub Pages — it does not run lint or tests, so run those yourself before considering work done.

## Architecture

**Layering**: `src/db` (Dexie/IndexedDB setup) → `src/domain` (repositories + business logic, one subfolder per entity) → `src/app` (routes/pages/components). UI code should call domain repository functions, not `db` directly. `src/lib` holds infrastructure-ish, entity-agnostic helpers (OPFS driver, localStorage typed keys).

**Dual persistence — Dexie for metadata, Yjs for content**: This is the central architectural decision (see `spec.md` §3). Every entity's structured/filterable fields (titles, tags, folder/notebook membership, timestamps) live directly in Dexie tables (`src/db/schema.ts`). A Note's actual editable content lives in a `Y.Doc` (CRDT), identified by `note.blockDocId`. Instead of the standard `y-indexeddb` provider, Yjs update binaries are appended to a single Dexie table `yjsUpdates` (keyed by `docId`) — see `src/domain/yjs/`. This keeps all persistence on one migration path. When adding a new entity with rich/collaborative content, follow this same split rather than storing content directly in a Dexie column.

**Yjs doc lifecycle** (`src/domain/yjs/yjsDocStore.ts`): `createYDoc()` mints a doc id; `loadYDoc(docId)` replays all `yjsUpdates` rows for that doc via `Y.applyUpdate`; `appendYDocUpdate` appends a new update row. Compaction is automatic: once a doc's update-row count exceeds `COMPACTION_UPDATE_COUNT_THRESHOLD` (`yjsCompaction.constants.ts`, currently 50), `compactYDoc` merges all rows into a single `Y.encodeStateAsUpdate` row via `replaceUpdateRows`. Any code path that appends updates or loads a doc should go through these functions, not raw Dexie calls to `yjsUpdates`.

**Repositories** (`src/domain/<entity>/<entity>Repository.ts`): plain async functions (not classes), one file per entity — `folderRepository`, `notebookRepository`, `noteRepository`, `boardRepository`, `settingsRepository`. Deletes cascade manually and are wrapped in `db.transaction('rw', ...)` across every affected table (e.g. `deleteFolder` recursively collects descendant folder ids, then cascades into notebooks/notes/boards/yjsUpdates in one transaction — see `folderRepository.ts`). When adding cascading deletes, follow this pattern rather than relying on Dexie foreign keys (there are none).

**Nullable foreign keys queried with `.filter()`, not `.where().equals()`**: Dexie's `.where(x).equals(null)` doesn't reliably match `null`-valued indexed fields, so top-level/unparented lookups (e.g. `listFoldersByParent(null)`, notes with no notebook) use `.filter()` instead. See the comment in `folderRepository.listFoldersByParent` and the mirrored note in `notebookRepository`. Keep using `.filter()` for this case rather than `.where().equals(null)`.

**IDs**: all entity ids are `crypto.randomUUID()` via `createId()` in `src/domain/ids.ts` — use this rather than any other id scheme.

**Routing**: `HashRouter` (required for static GitHub Pages hosting with no server-side rewrite support) with routes defined in `src/app/routes.tsx`: `/`, `/folders/:folderId`, `/notebooks/:notebookId`, `/notes/:noteId`, plus a catch-all 404.

**Theming**: `src/theme/ThemeProvider.tsx` manages a `light | dark | system` mode, persisted to `localStorage` via `createLocalStorageKey` (`src/lib/storage/localStorageKey.ts`) and resolved against `prefers-color-scheme` when `system`. The resolved theme is written to `document.documentElement.dataset.theme`; CSS consumes it via custom properties in `src/theme/tokens.css` (light/dark token sets) — components should reference tokens, never hardcode colors. Styling throughout is CSS Modules (`*.module.css` colocated with components).

**OPFS**: `src/lib/opfs/opfsDriver.ts` implements `OpfsDriver` (`writeFile`/`readFile`/`deleteFile`/`exists`) against the real Origin Private File System; `opfsMemoryDriver.ts` is an in-memory implementation for tests. Used for binary assets (images, sketches, embeds) — kept out of Dexie/Yjs by design.

**PWA**: `vite-plugin-pwa` (configured in `vite.config.ts`) precaches the full app shell for offline-first use; `base: '/notebuddy/'` matches the GitHub Pages subpath deploy.

## Testing

Vitest + `jsdom` + React Testing Library. `src/test/setup.ts` wires up `@testing-library/jest-dom` and `fake-indexeddb/auto` (so Dexie works under jsdom) and polyfills `window.matchMedia`. Tests colocate with source as `*.test.ts`/`*.test.tsx`. Repository tests (see `folderRepository.test.ts`) clear the relevant Dexie tables in `beforeEach` and exercise the real `db` instance (backed by fake-indexeddb) rather than mocking Dexie — follow this pattern for new repository tests.

## Style

- No semicolons, single quotes, 100-char print width, trailing commas everywhere (Prettier — `.prettierrc.json`). Run `pnpm format` rather than hand-formatting.
- ESLint flat config (`eslint.config.js`) extends recommended JS/TS/React/react-hooks/jsx-a11y rules plus Prettier's conflict-disabling config; `react/react-in-jsx-scope` and `react/prop-types` are off (not needed with the JSX transform + TS).
- `tsconfig.app.json` enables `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch` — keep code clean of these rather than suppressing.
