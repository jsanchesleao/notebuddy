# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Notebuddy is a private, offline-first note-taking PWA (React + TypeScript + Vite), statically hosted on GitHub Pages with no backend. See `pitch.md` (vision), `spec.md` (technical/functional spec — data model, architecture, encryption, sync design), and `roadmap.md` (phased implementation plan) for full context before making architectural decisions. The codebase has grown past Phase 0/1: folders/notebooks/boards/notes CRUD, a block-based note editor (text/image/sketch/code/table/embed blocks backed by Yjs), a user-defined custom data type/schema system for note properties, and a global tag registry are all implemented — check `src/` rather than assuming spec/roadmap phase boundaries reflect current state. Encryption (`Notebook.encryption` exists on the type but isn't wired up yet) and sync are still not built.

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

**Repositories** (`src/domain/<entity>/<entity>Repository.ts`): plain async functions (not classes), one file per entity — `folderRepository`, `notebookRepository`, `noteRepository`, `boardRepository`, `settingsRepository`, `dataTypeRepository`, `noteTypeRepository`, `tagRepository`. Deletes cascade manually and are wrapped in `db.transaction('rw', ...)` across every affected table (e.g. `deleteFolder` recursively collects descendant folder ids, then cascades into notebooks/notes/boards/yjsUpdates in one transaction — see `folderRepository.ts`). When adding cascading deletes, follow this pattern rather than relying on Dexie foreign keys (there are none).

**Dexie schema versioning**: `src/db/schema.ts` defines one `SCHEMA_V{n}` object per migration, applied in order via `this.version(n).stores(...)` in `src/db/db.ts` — add a new `SCHEMA_V{n+1}` (only the tables/indexes that changed) and a corresponding `this.version(n+1).stores(SCHEMA_V{n+1})` call rather than editing an existing version in place.

**Nullable foreign keys queried with `.filter()`, not `.where().equals()`**: Dexie's `.where(x).equals(null)` doesn't reliably match `null`-valued indexed fields, so top-level/unparented lookups (e.g. `listFoldersByParent(null)`, notes with no notebook) use `.filter()` instead. See the comment in `folderRepository.listFoldersByParent` and the mirrored note in `notebookRepository`. Keep using `.filter()` for this case rather than `.where().equals(null)`.

**IDs**: all entity ids are `crypto.randomUUID()` via `createId()` in `src/domain/ids.ts` — use this rather than any other id scheme.

**Routing**: `HashRouter` (required for static GitHub Pages hosting with no server-side rewrite support) with routes defined in `src/app/routes.tsx`: `/`, `/folders/:folderId`, `/notebooks/:notebookId`, `/boards/:boardId`, `/notes/:noteId`, `/data-types`, plus a catch-all 404.

**Block model — Yjs `Y.Array<Y.Map>`, not a separate schema** (`src/domain/blocks/`): a note's content is `doc.getArray<Y.Map>('blocks')` inside its `blockDocId` doc. `NoteBlock` (`blocks.types.ts`) is a discriminated union on `type`: `text` (Tiptap `JSONContent`), `image`/`sketch`/`embed` (binary payload lives in OPFS, block stores only the `opfsPath`), `code`, `table`. `noteBlocksStore.ts` exposes `insertBlock`/`updateBlock`/`deleteBlock`/`deleteBlocks`/`replaceBlock`/`moveBlock`/`appendBlock`, each converting to/from `Y.Map` and going through the same `mutateAndPersist` helper (`doc.transact` + `appendYDocUpdate` with a before/after state-vector diff) — add new block mutations here rather than touching the `Y.Array` directly. `src/app/notes/useNoteBlocks.ts` is the React binding: it loads the doc once per `docId`, calls `array.observeDeep` to resync a `blocks` snapshot on any change (including remote/CRDT-applied ones), and exposes the same mutation functions bound to the loaded doc. Callers must remount (`key={docId}`) on note switch since the hook doesn't reset state itself. Reordering/selection UI (`src/app/notes/blocks/`) uses `@dnd-kit` for drag-and-drop and layers `reorderBlocks`/`useBlockSelection` on top of the hook.

**Custom data type / schema system** (`src/domain/dataTypes/`): `DataTypeRef` (`entities.types.ts`) is a recursive, JSON-serializable schema shape: `primitive` (text/date/time/datetime/boolean/number/select/link/color), `list`, `set`, `tuple`, `dictionary`, or `customTypeRef` (points at a `CustomDataType.id`). `CustomDataType` rows are user-defined, reusable schemas stored in Dexie; `NoteType` rows wrap a `customTypeId` plus a name and are assignable to a `Notebook` (`defaultNoteTypeId`) or a `Note` (`noteTypeId`). A note's actual property values are ad hoc, though: `Note.metadata.properties` is a `Record<string, PropertyValue>` where each entry carries its own inline `typeRef` — not derived from the note's `NoteType` schema at read time — so validate/generate against the value's own `typeRef`, not by re-resolving the note type. Supporting modules: `schemaGraph.ts` (`collectCustomTypeReferences`, `wouldCreateCycle` — call before saving an edited `CustomDataType` so a `customTypeRef` can't reference itself transitively), `schemaValidator.ts` (`validateValue`/`assertValid`, recursive per-`typeRef`), `defaultValueGenerator.ts` (zero-value for a given `typeRef`, used when adding a new property/field), `optionSets.ts` (reusable named option lists for `select` primitives). The `src/app/dataTypes/` and `src/app/propertyValues/` folders are the corresponding editor/display UI (one `*ValueEditor`/`*ValueDisplay` pair per primitive/composite kind) — follow that pairing when adding a new primitive kind rather than branching inside a shared component.

**Boards and sticky notes share their owning entity's Y.Doc, not a separate one**: a `Board`'s card ordering (`boardCardsStore.ts`, top-level `Y.Array<string>` named `cardOrder`) lives in the doc at `Board.cardsDocId`; a card's column is derived from its note's `status` property (`groupCardsByColumn.ts`), not stored on the card itself. `StickyNote`s (`stickyNotesStore.ts`, `Y.Array<Y.Map>` named `stickyNotes`) are placed inside whichever entity they're pinned to — `Note.blockDocId`, `Board.cardsDocId`, or `Notebook.stickyNotesDocId` — coexisting with that doc's own top-level array (`blocks`/`cardOrder`) under a different array name, rather than getting a dedicated doc of their own. Both stores follow the same `mutateAndPersist` (`doc.transact` + state-vector-diffed `appendYDocUpdate`) pattern as `noteBlocksStore.ts`.

**Tags**: a note's tags are plain strings on `note.metadata.tags`. Tag _color_ is tracked separately in a global `tags` Dexie table (`TagRecord { name, color, createdAt }`, keyed by name) via `src/domain/tags/tagRepository.ts` — `ensureTagColor` assigns a least-used color from `PILL_PALETTE` (`tagPalette.ts`) the first time a tag name is used anywhere, and entries are never pruned, so a tag keeps its color even after every note using it is deleted/untagged. Don't derive tag color from the note; always go through this table.

**Theming**: `src/theme/ThemeProvider.tsx` manages a `light | dark | system` mode, persisted to `localStorage` via `createLocalStorageKey` (`src/lib/storage/localStorageKey.ts`) and resolved against `prefers-color-scheme` when `system`. The resolved theme is written to `document.documentElement.dataset.theme`; CSS consumes it via custom properties in `src/theme/tokens.css` (light/dark token sets) — components should reference tokens, never hardcode colors. Styling throughout is CSS Modules (`*.module.css` colocated with components).

**OPFS**: `src/lib/opfs/opfsDriver.ts` implements `OpfsDriver` (`writeFile`/`readFile`/`deleteFile`/`exists`) against the real Origin Private File System; `opfsMemoryDriver.ts` is an in-memory implementation for tests. Used for binary assets (images, sketches, embeds) — kept out of Dexie/Yjs by design.

**PWA**: `vite-plugin-pwa` (configured in `vite.config.ts`) precaches the full app shell for offline-first use; `base: '/notebuddy/'` matches the GitHub Pages subpath deploy.

## Testing

Vitest + `jsdom` + React Testing Library. `src/test/setup.ts` wires up `@testing-library/jest-dom` and `fake-indexeddb/auto` (so Dexie works under jsdom) and polyfills `window.matchMedia`. Tests colocate with source as `*.test.ts`/`*.test.tsx`. Repository tests (see `folderRepository.test.ts`) clear the relevant Dexie tables in `beforeEach` and exercise the real `db` instance (backed by fake-indexeddb) rather than mocking Dexie — follow this pattern for new repository tests.

## Style

- No semicolons, single quotes, 100-char print width, trailing commas everywhere (Prettier — `.prettierrc.json`). Run `pnpm format` rather than hand-formatting.
- ESLint flat config (`eslint.config.js`) extends recommended JS/TS/React/react-hooks/jsx-a11y rules plus Prettier's conflict-disabling config; `react/react-in-jsx-scope` and `react/prop-types` are off (not needed with the JSX transform + TS).
- `tsconfig.app.json` enables `noUnusedLocals`/`noUnusedParameters`/`noFallthroughCasesInSwitch` — keep code clean of these rather than suppressing.
