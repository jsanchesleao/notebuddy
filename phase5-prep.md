# Phase 5 Prep — Search (FlexSearch)

Reference doc for resuming the Phase 5 (Search) prep work. See `roadmap.md` §Phase 5 and `spec.md` §6 for the original requirements. The full decision record (every architectural fork, with the reasoning) lives in the plan file this was built from: `C:\Users\User\.claude\plans\please-explore-the-codebase-twinkly-pnueli.md` — read that first if any "why" below is unclear.

**Status**: Design-only. Nothing listed below is implemented yet. Phase 4 (`44a179c "ending phase 4"`) is committed and closed out, so this is clear to start.

**Saved searches** (§8 below) were added to this prep on request, beyond `spec.md`/`roadmap.md`'s own Phase 5 scope — every fork (what's captured, scope, stale refs, UI surface, run destination, ordering) was raised as an explicit question and confirmed before being designed, not assumed.

---

## Confirmed design

1. **New dependency**: `flexsearch` (not yet installed).

2. **`src/domain/search/`** (new domain module):
   - `searchIndex.types.ts` — `SearchDocument { noteId, title, tags, content }` (`content` = stringified properties + extracted block text, one combined field rather than per-property, since properties aren't fixed schema).
   - `extractBlockText.ts` — pure `extractBlockText(block: NoteBlock): string`, one case per block type (`text` walks TipTap `JSONContent` for `.text`; `code` → `code`; `table` → cell values joined; `image`/`embed` → `caption`; `sketch` → `''`, not searchable in v1 per spec.md §6).
   - `searchIndexStore.ts` — module-level singleton FlexSearch `Document` index (fields: `title` boosted, `tags`, `content`). `initSearchIndex()` (load persisted snapshot, else rebuild from `db.notes` + `loadNoteBlocks`), `indexNote(note, blockText)`, `removeNoteFromIndex(noteId)`, `searchNotes(query, scope?: {notebookId?, boardId?})` (scope = intersect FlexSearch result ids with a Dexie-fetched id set; index itself stays workspace-flat).
   - `searchIndexPersistence.ts` — FlexSearch `export()`/`import()` round-trip against the new Dexie table below, debounced persist (`SAVE_DEBOUNCE_MS` convention).

3. **`SCHEMA_V7`** (`src/db/schema.ts` + `db.ts`): new table `searchIndexSnapshot: 'key'` (one row per FlexSearch export chunk). Standard append-only versioning, don't touch `SCHEMA_V6`.

4. **Incremental sync — Dexie hooks, not repository edits**: `db.notes.hook('creating'|'updating'|'deleting', ...)` registered once in `src/domain/search/searchIndexSync.ts`, wired at app init. Avoids threading index calls through every `noteRepository.ts` write path (`createNote`, `renameNote`, `setNoteProperty`, `removeNoteProperty`, `setNoteTags`, `deleteNote`, the bulk-delete functions) and can't drift as new mutators get added.
   - Block content has no Dexie hook (lives in `yjsUpdates`, not a note column) — reindex from the page level instead: a debounced `useEffect` in `NotePage.tsx` on `useNoteBlocks`'s `blocks` output, calling `indexNote(note, extractBlocksText(blocks))`. Keeps `noteBlocksStore.ts`/`useNoteBlocks.ts` entity-agnostic (they only know `docId`/`doc`, never "note").

5. **Scoped search upgrade**: `noteMatchesSearch` (`noteFilterMatch.ts`) and `NotebookPage.tsx`'s quick-search switch from `note.title.includes(...)` to `searchNotes(query, {notebookId})`. `NoteFilter`'s `title` criterion (`noteFilter.types.ts`, `FilterBlock.tsx`) becomes index-backed full-text matching instead of a raw substring check — label text ("Title contains..." vs. "Matches...") is an open call, not a blocker.

6. **Global search — dedicated `/search` page** (not a command palette, confirmed with the user): new route in `routes.tsx` + `RouteKind` entry, `src/app/pages/SearchPage.tsx` (query via `useSearchParams`, `?q=...`, results via `buildNoteCrumbs` for context), entry point is a persistent search control in `AppShell.tsx`'s header. **Confirmed**: `SearchPage` also embeds the existing `NoteFilter` component (fed all notes globally, no changes needed to that component) so a global search can combine free text with structured tag/noteType/property criteria — combined via AND, same as `NoteFilter`'s own combination logic.

7. **Saved Searches** — new, confirmed with the user (not in `spec.md`):
   - **Type**: `SavedSearch { id, name, notebookId: string | null, boardId: string | null, query: string, filter: FilterState, order: number, createdAt, updatedAt }` in `entities.types.ts`. Both `notebookId`/`boardId` null = global; exactly one set = scoped to that notebook/board — mirrors `Note`'s own nullable-FK convention. Can carry a query, a filter, or both.
   - **Schema**: `SCHEMA_V8` adds `savedSearches: 'id, notebookId, boardId'`.
   - **Repository** `src/domain/savedSearches/savedSearchRepository.ts`: `createSavedSearch`, `listSavedSearches()`, `renameSavedSearch`, `updateSavedSearchQuery`, `reorderSavedSearches` (mirrors `boardRepository.reorderColumns`), `deleteSavedSearch`.
   - **Stale references — soft degrade (confirmed)**: deleting a tag/note type/property never blocked by a saved search referencing it. No new reference-check anywhere (unlike `deleteNoteType`'s `defaultNoteTypeId` check) — `noteType`/`property` criteria already degrade to "no match" gracefully via existing code (`evaluatePropertyCriterion`'s `resolveTypeRef` handling), tags aren't deletable entities at all.
   - **Running a saved search — lands on its own page (confirmed)**: global → `/search?q=...` with filter applied to `SearchPage`'s embedded `NoteFilter`; scoped → that notebook's/board's own page, pre-filling its existing quick-search + `NoteFilter` state.
   - **UI — inline + persistent Sidebar (confirmed)**: "Save search" action next to `NoteFilter`'s dropdown and on `SearchPage` (name-prompt inline form, enabled once query or ≥1 criterion is active). New `src/app/savedSearches/SavedSearchList.tsx` — persistent Sidebar section (alongside "Data Types" link), flat list with a scope indicator per row, rows reuse `EditableEntityRow`'s rename/delete, click runs per the rule above.
   - **Manual reordering (confirmed)**: drag-and-drop via `@dnd-kit`, same grip-handle convention as `FolderTreeNode.tsx`, one flat `order` field across all saved searches regardless of scope.
   - Tests: `savedSearchRepository.test.ts` (CRUD + reorder), `SavedSearchList.test.tsx` (render/run/reorder/rename/delete + stale-reference case).

8. **Testing**: `extractBlockText.test.ts` (per block type), `searchIndexStore.test.ts` (index/remove/search/scope/rebuild), `searchIndexPersistence.test.ts` (export/import round-trip), hook-sync test (create/update/delete actually patch the index, not just call-existence), `SearchPage.test.tsx` (including embedded filter), updated `noteFilterMatch.test.ts`, saved-search tests per §7.

## Verification checklist

- `pnpm typecheck`, `pnpm lint`, `pnpm format`
- `pnpm test`
- `pnpm build`
- Manual `pnpm dev` walkthrough: seed varied notes (titles/tags/properties/block content), confirm scoped + global search match on all of those (not just title) and the global filter narrows results, reload and confirm no visible rebuild delay (snapshot persistence), edit/delete a note and confirm results update live. For saved searches: create one scoped (from a notebook) and one global (from `SearchPage`), confirm both show in the Sidebar, confirm running each lands correctly, drag-reorder and reload to confirm order persists, delete a note type a saved search's filter references and confirm it still runs (fewer matches, no error).

## Open items

- FlexSearch tokenizer/weighting tuning — default is the starting point, revisit only if manual search quality is poor.
- `NoteFilter` text-criterion label wording.
- `SearchPage` result ordering (relevance vs. grouped by notebook/board).
- "Save search" inline form's exact placement/wording.
- Whether duplicate saved-search names are allowed (default: yes, no uniqueness constraint).
