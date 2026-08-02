# Phase 4 Prep — Remaining Tasks

Reference doc for resuming the Phase 4 (Organizational Structures) prep work. See `roadmap.md` §Phase 4 and `spec.md` §4.6/§5 for the original requirements. The full decision record (every architectural fork, with the reasoning) lives in the plan file this was built from: `C:\Users\User\.claude\plans\i-want-to-prepare-snazzy-leaf.md` — read that first if any "why" below is unclear.

**Status**: Sections 0 (cleanup) and 1 (schema migration) are done, committed (`a346844 "some cleanup"`), and verified. Section 2 (folders tree/breadcrumbs/move) and Section 3 (notebook default note type + filter UI) are done, committed (`ffc1daf "notebook initial filtering"`). **Section 4 (Boards) is now also done and verified** (typecheck/lint/629 tests/build all green; manually walked through in a real browser via Playwright, including actual pointer drag-and-drop between columns) — see below for what's implemented; not yet committed. Section 5 (Sticky Notes) has not been started.

One real bug found and fixed during the browser walkthrough, worth knowing about if touching `OptionSetPicker` again: **`OptionSetPicker` renders its own inline `<form>` (via `OptionSetForm`) when creating/editing an option set.** Any modal that wraps `OptionSetPicker` in its own outer `<form>` (as `BoardCreateModal` originally did) creates a nested-`<form>` DOM structure, which is invalid HTML — submitting the inner form bubbles a native `submit` event up to the outer form too, and since HTML can't nest forms, the browser falls back to a real (unintended) page navigation/reload, silently wiping all component state. Fixed by making `BoardCreateModal`'s wrapper a plain `<div>` with an explicit `onClick`-triggered submit instead of a `<form onSubmit>` (see `src/app/boards/BoardCreateModal.tsx`). Also noted: `OptionSetPicker`'s inline "create new" flow leaves its own dropdown open afterward (pre-existing behavior shared by every consumer, e.g. `AddPropertyControl`) — not a bug, just something a caller's own UI/tests need to account for (click the trigger again, or click away, to dismiss it).

---

## Done already (for context, don't redo)

- **Cascade-delete bug fixed**: `boardRepository.ts` now has `deleteBoard`/`deleteBoardsByFolderId` with proper notes/yjsUpdates/OPFS cleanup; `folderRepository.deleteFolder` calls it instead of a raw `db.boards` delete.
- **Shared `runCascadeDelete` helper**: `src/domain/cascadeDelete.ts`, used by folders/notebooks/notes/boards repositories.
- **Dedup**: `src/lib/color/hexColor.ts` (`HEX_COLOR_REGEX`), `src/app/notes/blocks/alignmentOptions.ts` (`ALIGNMENTS`/`WIDTH_PRESETS`/`Alignment`), `src/app/notes/blocks/blockEditing.constants.ts` (`SAVE_DEBOUNCE_MS`), `src/domain/dataTypes/resolveTypeRef.ts` (dereferences a `customTypeRef` chain — **note**: `PropertyValueEditor`/`PropertyValueDisplay` strip `onSchemaChange`/`isEditingTuple` when the _original_ `typeRef.kind === 'customTypeRef'`, to preserve the "never edit schema across a customTypeRef boundary" rule — see the `crossedCustomTypeRef` check in `PropertyValueEditor.tsx` if touching this again).
- **Removed**: `src/domain/settings/settingsRepository.ts` (was unused; `localStorage` via `createLocalStorageKey` is the standing convention for UI state).
- **New hook**: `src/app/notes/useOpfsImageUpload.ts` (extracted from `ImageBlock`, ready for board card images).
- **`SCHEMA_V4` migration** (`src/db/schema.ts`, `src/db/db.ts`) already adds:
  - `Board.cardsDocId: string` — Y.Doc id for card ordering + board sticky notes (mirrors `Note.blockDocId`). Minted via `createYDoc()` in `createBoard` (§4, now done).
  - `Board.statusTypeId: string | null` — permanent link to the option-set `CustomDataType` backing the board's columns. Indexed (`boards: 'id, folderId, statusTypeId'`) so `deleteCustomDataType` can check for referencing boards.
  - `Notebook.stickyNotesDocId: string` — Y.Doc id for the notebook's sticky-note canvas. **Already minted** in `notebookRepository.createNotebook` and cleaned up in `deleteNotebook`/`deleteNotebooksByFolderId`.
  - `Note.description?: string` and `Note.cardImagePath?: string` — board-card fields, types only so far, no repository functions to set them yet.

---

## 2. Folders — tree UI, breadcrumbs, move/reparent — DONE

Implemented (uncommitted, sitting alongside sections 0-1 on `main`):

- **Repository**: `listFolderAncestors`/`moveFolder`/`FolderMoveError` in `folderRepository.ts` (cycle detection mirrors `wouldCreateCycle`'s approach — walks the new parent's ancestor chain, rejects if the moved folder appears, plus a direct self-parent check). Tests in `folderRepository.test.ts`.
- **Breadcrumbs**: `src/app/common/breadcrumbs.ts` (`buildFolderCrumbs`/`buildNotebookCrumbs`/`buildNoteCrumbs`) + `Breadcrumb.tsx` component, replacing the old single-hop "Back" link in `FolderPage.tsx`/`NotebookPage.tsx`/`NotePage.tsx`.
- **Tree UI**: `src/app/Sidebar/FolderTree.tsx` + `FolderTreeChildren.tsx` + `FolderTreeNode.tsx` — recursive, lazy-loaded (children only queried once a node is expanded and mounted), folders/notebooks/boards all shown inline at their depth rather than in separate flat sections. Expand/collapse persisted via `useExpandedFolders.ts` (plain `localStorage`, not `createLocalStorageKey` — that helper is for a bounded enum, not an arbitrary id set). The active folder's ancestor chain auto-expands on navigation (`useAutoExpandActiveFolder`). `SidebarFolderView.tsx` now just wraps `FolderTree`.
- **Move/reparent**: both entry points done — drag-and-drop in the tree (each `FolderTreeNode` is a dnd-kit draggable+droppable via a dedicated grip handle, following the `SortableBlockWrapper` grip-button convention rather than whole-row dragging; a `RootDropZone`/"Home" link at the top of the tree is the top-level drop target) and a "Move to..." action on `EditableEntityRow` (`onMove` prop) opening `src/app/folders/FolderPickerModal.tsx` (own lightweight picker tree, `FolderPickerTree.tsx`, not the sidebar tree — the sidebar tree's drag/navigation wiring didn't fit a selection-only picker; descendants of the folder being moved are disabled, not hidden).
- Manually verified end-to-end in a real browser (create nested folders, breadcrumb navigation, tree expand/auto-expand, move via the "Move to..." modal, cycle rejection shown as disabled options in the picker) — zero console errors. Drag-and-drop reparenting wasn't separately driven through Playwright (pointer-drag sequences are awkward to script reliably) but shares the same `moveFolder` call and error handling as the modal path.

## 3. Notebooks — default note type + filter UI

- **Default note type**: wire up the (currently dead) `Notebook.defaultNoteTypeId`. Add a picker control near `EntityPageHeader` on `NotebookPage.tsx`. Update `NoteCreateModal.tsx` to preselect `notebook.defaultNoteTypeId` instead of always defaulting to `null`.
- **Filter UI**: new `NoteFilter` component — tag membership, property-value match, note-type match, **and simple title substring match** (confirmed in scope, even though full-text/FlexSearch is Phase 5). Operates in-memory over the notes array already fetched via `useLiveQuery(listNotesByNotebook(...))` — no search index. Build as a standalone, reusable component from the start — §4 (boards) reuses it.

## 4. Boards — CRUD, option-set-linked columns, kanban DnD, cards, filtering — DONE

Implemented per the design below, with a few refinements decided along the way (recorded in the plan file this was built from: `C:\Users\User\.claude\plans\please-continue-with-the-tingly-swing.md`):

- **Domain**: `boardRepository.ts` gained `createBoard`, `getBoard` (now reconciles `columns` against the linked `CustomDataType`'s options on every read, preserving board-local drag order/color/visibility), `renameBoard`, `setColumnColor`, `setColumnVisibility`, `reorderColumns`, `applyColumnEdits` (the add/rename/delete-with-reassignment mutation), `findOtherStatusTypeReferences`. New `src/domain/boards/boardCardsStore.ts` (Y.Doc card ordering, mirrors `noteBlocksStore.ts`) using a single flat `{noteId, columnId}` array rather than one array per column. `src/lib/color/leastUsedColor.ts` extracted out of `tagRepository.ts` so board columns get their own board-local least-used-color pool. `noteRepository.createNote` derives the `status` property + card-order entry when `boardId` is set (reads `db.boards` directly rather than importing `boardRepository`, to avoid a `boardRepository` ↔ `noteRepository` import cycle since `boardRepository` already depends on `noteRepository` for cascade deletes). `deleteCustomDataType` now also rejects deletion if a board's `statusTypeId` references it. **Refinement vs. the original design below**: `applyColumnEdits` only requires a `reassignToColumnId` for a removed column when notes actually reference it — an empty column can just be dropped, no forced pointless choice.
- **UI** (`src/app/boards/`): `BoardPage.tsx` (`/boards/:boardId`, new `'board'` `RouteKind`), `BoardCreateModal.tsx` (embeds the existing `OptionSetPicker` as-is for column source — reuse over rebuild), `KanbanBoard.tsx` + `useBoardCards.ts` + `BoardColumnView.tsx` + `BoardColumnHeader.tsx` + `BoardCard.tsx` (dnd-kit multi-container: one `SortableContext` per column plus a column-level `SortableContext`/`useSortable` for column reordering, `useDroppable` per column body, `DragOverlay`), `ManageColumnsControl.tsx` (wraps the shared `OptionSetForm` with reassignment-prompt glue instead of the originally-sketched per-column inline rename/`InlineCreateForm`), `groupCardsByColumn.ts` (pure grouping helper with a fallback for a card not yet reflected in the mounted board's own Y.Doc instance — see below), `BoardCardDetails.tsx` (description/image editor, shown on `NotePage.tsx` when `note.boardId` is set). `NoteCreateModal.tsx` now accepts board-only cards (`notebookId` OR `boardId`) and skips navigation for board cards so the user stays on the kanban board after adding one.
- **Important architectural note for future board work**: this app has no live cross-instance Y.Doc sync (no y-indexeddb/BroadcastChannel provider) — two separately-`loadYDoc()`'d instances of the same `docId` don't observe each other's mutations in memory, they only share persisted state via Dexie. So when `createNote` appends a card-order entry via its own doc load while `KanbanBoard` is already mounted with its own doc instance, the mounted board never sees that append via `observeDeep`. `groupCardsByColumn` works around this with a fallback: a note missing from `cardOrder` is appended to the column matching its own `status` property value, purely so it's visible immediately; proper position reconciles on the next full board load.
- **Bug found + fixed during manual browser verification**: see the note above the Section 4 heading — nested `<form>` in `BoardCreateModal` caused a real page reload when creating an option set inline.
- Tests: `leastUsedColor.test.ts`, `boardCardsStore.test.ts`, `groupCardsByColumn.test.ts`, `useBoardCards.test.tsx`, extended `boardRepository.test.ts`/`noteRepository.test.ts`/`dataTypeRepository.test.ts`/`NoteCreateModal.test.tsx`/`Fab.test.tsx`/`NotePage.test.tsx`, new `BoardCreateModal.test.tsx`/`BoardCardDetails.test.tsx`. 629 tests total, all green; typecheck/lint/format clean; production build succeeds.

<details>
<summary>Original pre-implementation design (kept for reference)</summary>

Largest remaining piece. `src/domain/boards/boardRepository.ts` currently only has `getBoard`/`listBoardsByFolder`/`deleteBoard`/`deleteBoardsByFolderId` — no create/update/column-management yet.

**The board↔option-set relationship (confirmed design)**:

- `createBoard(input)` takes a title, `folderId`, and a `CustomDataType` id that must be a "select" schema (`isOptionSetSchema` in `src/domain/dataTypes/optionSets.ts`) — either an existing one or a freshly created one. For each `SelectOption` in it: create one `BoardColumn` with `id = option.id`, `name = option.label`, `tag = option.value`, `color` auto-assigned via the same least-used-color logic `ensureTagColor` uses (`src/domain/tags/tagRepository.ts`), `visible: true`. Store `statusTypeId = customDataType.id`. Mint `cardsDocId` via `createYDoc()`.
- **The link to the CustomDataType is permanent**: renaming/retagging a column later edits the underlying `CustomDataType`'s `SelectOption` via `updateCustomDataType` (shared across anything else using that same option set — this is intentional per the user). **Column color stays board-owned** (only on `BoardColumn`, never written back to the `CustomDataType`).
- **Column delete**: if notes reference the column (via their `status` property value), the UI must prompt the user to pick a fallback column before the repository call proceeds (no silent reassignment) — the repository function takes an explicit `reassignToColumnId` param.
- Update `deleteCustomDataType` (`src/domain/dataTypes/dataTypeRepository.ts`) to also reject deletion if any board's `statusTypeId` references it (alongside its existing note-type/note reference checks) — the `statusTypeId` index added in `SCHEMA_V4` is there for exactly this query.
- `createNote`/`CreateNoteInput` (`src/domain/notes/noteRepository.ts`): when `boardId` is set, auto-add a `status` property with a `customTypeRef` typeRef pointing at the board's `statusTypeId`, defaulting to the first visible column's option value. (Currently `boardId` is accepted but nothing derives `status` from it.)
- Card fields: `description`/`cardImagePath` (added to `Note` type already) need repository setters — check whether a generic `updateNote` exists before adding narrow ones.

**UI** (`src/app/boards/`, doesn't exist yet):

- `BoardPage.tsx`, new `/boards/:boardId` route in `routes.tsx`, new `'board'` `RouteKind` in `routeContext.tsx`, wire into `Sidebar.tsx` and `AppShell.tsx`. Same page shape as other detail pages: breadcrumb → `EntityPageHeader` → content.
- Board creation: add "New Board" to `Fab.tsx`'s `CreateAction` union — a modal prompting title + column source (pick existing option-set type, or define new columns inline which creates one under the hood).
- Kanban: one `SortableContext` per column + `useDroppable` per column (cross-column drops) + a `DragOverlay` — heavier than the existing `NoteBlockList` single-list pattern, extend its sensor/collision setup rather than copy it.
- Column headers: click-to-rename inline, `DismissableDropdown` for color+tag (reuse `TagColorPicker`'s structure from `src/app/notes/PropertiesPanel/TagColorPicker.tsx`), visibility toggle, `InlineCreateForm` for "+ Add column".
- Cards: title, optional description, optional image (via `useOpfsImageUpload`, already extracted). "New card" per column footer opens the existing `NoteCreateModal` with `boardId` + that column's status pre-set.
- Filtering: reuse `NoteFilter` from §3.
- Column visibility persisted via `localStorage`.
- New `boardRepository.test.ts` additions needed: create/column CRUD/column-delete-reassignment/full cascade.

</details>

## 5. Sticky Notes — new domain + free-form canvas + mobile gallery

Fully greenfield.

- **Types**: add `StickyNote` to `src/domain/entities.types.ts` per `spec.md` §4.6 (`id`, `ownerId`, `x`/`y`, `color`, `content: {kind:'text',text} | {kind:'sketch',strokes:Stroke[]}`). Reuse the existing `Stroke` type (`src/domain/blocks/blocks.types.ts`) and the `SketchBlock`/`perfect-freehand` approach for sketch editing.
- **Persistence**: lives inside the owning entity's Y.Doc — `Note.blockDocId` (existing), `Board.cardsDocId`, or `Notebook.stickyNotesDocId` (both already added in `SCHEMA_V4`) — as a `Y.Array<Y.Map>`, same `mutateAndPersist`/`appendYDocUpdate` pattern as `src/domain/blocks/noteBlocksStore.ts`. New `src/domain/stickyNotes/stickyNotesStore.ts` mirroring that file's shape.
- **Color palette**: reuse `PILL_PALETTE` from `src/domain/tags/tagPalette.ts` + `src/lib/color/contrastColor.ts` for text contrast.
- **Drag mechanics**: add `@dnd-kit/modifiers` as a new dependency (not yet installed). Free-form dragging uses `useDraggable` (not `useSortable` — XY placement, not list order) + a `restrictToParentElement`-style modifier; `onDragEnd`'s `event.delta` updates stored `{x,y}`.
- **Mobile gallery**: reuse `src/components/Modal/Modal.tsx`, gated by the existing `useIsMobile()` hook (`src/app/useIsMobile.ts`, `<768px`).
- Wire into `NotePage.tsx`, the new `BoardPage.tsx`, and `NotebookPage.tsx`.
- New `stickyNotesStore.test.ts` mirroring `noteBlocksStore.test.ts`.

---

## Verification checklist (repeat for each section)

- `pnpm typecheck`, `pnpm lint`, `pnpm format`
- `pnpm test` — add tests alongside every new repository function
- `pnpm build` (this is literally what CI runs — nothing else is checked automatically)
- Manual `pnpm dev` walkthrough of the new flow

## Open item

Nothing from Sections 0–1 has been committed yet. Decide on commit granularity (e.g. one commit for cleanup, one for the schema migration, or split further) before starting Section 2, so the history stays reviewable.
