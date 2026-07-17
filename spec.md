# Notebuddy — Technical & Functional Specification

This document turns the vision in `pitch.md` into concrete, implementable decisions. Where the original pitch left a choice open, that choice has been made explicitly below (see "Assumed Defaults" in §13 for the smaller details that were not discussed and may need revisiting).

## 1. Overview & Goals

Notebuddy is a private, secure, free note-taking PWA:

- **Private**: no required account, no required backend. All data lives on-device by default.
- **Secure**: notebooks can be password-protected; anything that leaves the device (WebRTC or Firebase sync) is end-to-end encrypted client-side.
- **Free**: static site hosted on GitHub Pages. Any cloud sync is opt-in and uses the *user's own* Firebase project, never a project operated by Notebuddy.
- **Offline-first**: the app must be fully usable — creating, editing, organizing, and searching notes — with zero network connectivity, forever. Sync is an enhancement, never a requirement.

**Non-goals (v1)**: real-time multi-cursor collaboration UX, external embed providers (YouTube/Spotify/etc.), server-side search/indexing, mobile native apps.

## 2. Tech Stack

| Concern | Choice |
|---|---|
| UI framework | React + TypeScript |
| Build tool | Vite |
| PWA tooling | `vite-plugin-pwa` (Workbox under the hood) |
| Rich text / block editor | TipTap (ProseMirror-based) |
| Structured local storage | Dexie.js over IndexedDB |
| CRDT / sync-ready content model | Yjs |
| Binary asset storage | OPFS (Origin Private File System) |
| Sketch input | Custom `<canvas>` + `perfect-freehand` |
| Code block highlighting | Plain `<textarea>` + Prism.js overlay |
| Table block | Custom lightweight grid component |
| Kanban drag-and-drop | dnd-kit |
| Full-text search | FlexSearch |
| Styling | CSS Modules + hand-built design-token system |
| Testing | Vitest + React Testing Library |

Hosting: static build deployed to GitHub Pages. No server-side code anywhere in the stack.

## 3. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      React UI Layer                     │
│   (screens, note editor, boards, sticky notes, search)  │
└───────────────────────┬───────────────────────────────--┘
                         │
┌───────────────────────▼───────────────────────────────--┐
│                    Domain / Store Layer                 │
│  - Repositories (Folders, Notebooks, Boards, Notes)      │
│  - CustomDataType & NoteType registries                  │
│  - Search index manager (FlexSearch)                     │
│  - Encryption service (PBKDF2 + AES-GCM)                 │
│  - Sync coordinators (WebRTC, Firebase) — Phases 9/10     │
└──────────┬───────────────────────────────┬───────────--──┘
           │                               │
┌──────────▼─────────────┐     ┌───────────▼─────────────-┐
│         Dexie           │     │           OPFS           │
│  - folders, notebooks    │     │  - images                │
│  - boards, note index    │     │  - sketch bitmaps (n/a — │
│  - metadata/properties    │     │    strokes are in Yjs)   │
│  - settings               │     │  - arbitrary file blobs  │
│  - Yjs update blobs table │     └───────────────────────--┘
└──────────────────────────┘
```

**Why Yjs + Dexie together, not `y-indexeddb`:** each Note (and each Board's sticky-note/card layer) owns one `Y.Doc`. Instead of using the official `y-indexeddb` provider (a second, parallel persistence mechanism), Yjs update binaries are appended to a single Dexie table (`yjsUpdates`, keyed by doc id). This keeps *all* persistence going through one database and one migration path. A snapshot/compaction routine periodically merges accumulated updates into a single state vector to bound table growth.

**Content vs. metadata split:** Dexie holds everything that needs fast structured queries and filtering (titles, tags, custom property values, timestamps, notebook/folder/board membership) so search and list views never need to load a full CRDT doc. Yjs docs hold the actual editable content (note blocks, sticky note positions/content, board card ordering) so concurrent edits merge automatically once sync ships. Property *values* used for filtering are mirrored into Dexie whenever the Yjs doc changes (single-writer, so this is a simple projection, not a second source of truth).

## 4. Data Model

### 4.1 Note

```ts
interface Note {
  id: string;
  notebookId: string | null;   // null if it lives directly in a Board
  boardId: string | null;
  noteTypeId: string | null;   // which blueprint (if any) this note was created from
  title: string;
  metadata: NoteMetadata;
  blockDocId: string;          // id of the Y.Doc holding the ordered Note Blocks
  createdAt: string;           // ISO 8601
  updatedAt: string;
}
```

A Note's content is a `Y.Doc` containing a `Y.Array` of Note Block entries. Reordering blocks is a CRDT array move, so it merges safely across devices.

### 4.2 Note Blocks

Each entry in the block array is a discriminated union:

```ts
type NoteBlock =
  | { type: 'text'; id: string; content: TipTapJSON }
  | { type: 'image'; id: string; opfsPath: string; caption?: string; width?: number }
  | { type: 'sketch'; id: string; strokes: Stroke[]; width: number; height: number }
  | { type: 'code'; id: string; language: string; code: string }
  | { type: 'table'; id: string; rows: TableCell[][] }
  | { type: 'embed'; id: string; opfsPath: string; mimeType: string; caption?: string };

interface Stroke { points: [x: number, y: number, pressure: number][]; color: string; size: number; }
interface TableCell { value: string; }
```

- **text**: a TipTap document fragment (JSON), rendered inline as part of the seamless page.
- **image**: references a file in OPFS.
- **sketch**: vector stroke data captured via `perfect-freehand`, rendered to canvas; stored as points (not a bitmap) so it stays editable and syncs efficiently through Yjs.
- **code**: raw text + language tag; Prism applies highlighting as an overlay at render time (the stored value is always plain text).
- **table**: v1 supports text-only cells in a simple rows×columns grid (no merged cells, no per-cell rich formatting).
- **embed**: v1 wraps local OPFS files only (images, PDFs, etc. that the browser can render); external URL embeds are out of scope for v1 (see §13).

The block type union is designed to be extended (new block kinds added later) without touching existing block data.

### 4.3 Note Metadata

```ts
interface NoteMetadata {
  tags: string[];
  createdAt: string;
  updatedAt: string;
  properties: Record<string, PropertyValue>; // keyed by property name
}
```

### 4.4 Data Types

**Primitive types (v1):** `text`, `date`, `time`, `datetime`, `boolean`, `number`, `select`, `link`, `color`.

- `select` properties carry their own option list (label + value), editable per-property.
- `link` is an external URL in v1 (see §13 for the internal note-link question).
- `color` is stored as a hex string; the editor renders a color-wheel/swatch picker.

**Composite types** — built from primitives (or other composites) via a **visual schema builder** (a form/graph UI to compose fields, not a JSON/text editor):

| Composite | Semantics | Constraints |
|---|---|---|
| List | ordered, repeatable values of one inner type | optional max size |
| Set | unordered, repeatable values of one inner type | de-duplicated by value equality |
| Tuple | fixed-length, positional, each position has its own type | length fixed at definition time |
| Dictionary | string-keyed map to values of any type (including nested dictionaries) | keys must be unique strings |

A `CustomDataType` is stored as a schema definition (recursive JSON describing the composite tree down to primitives) plus a name; property values conforming to it are validated against that schema when saved.

### 4.5 Note Types

A `NoteType` is a named blueprint built from a Dictionary custom type. Creating a note "of" a type pre-fills its `properties` with the blueprint's fields (with sensible empty defaults per data type).

**Enforcement: soft template only.** After creation, the user may freely edit, remove, or add properties — nothing is validated against the blueprint on save. The blueprint only affects the *initial* note-creation experience, not ongoing constraints.

### 4.6 Sticky Notes

```ts
interface StickyNote {
  id: string;
  ownerId: string;        // Note id, Notebook id, or Board id it's attached to
  x: number; y: number;   // free-form pixel position, no snapping
  color: StickyColor;     // from a fixed predefined palette
  content: { kind: 'text'; text: string } | { kind: 'sketch'; strokes: Stroke[] };
}
```

Positions and content live inside the owning entity's `Y.Doc` alongside blocks/cards. On mobile viewports, sticky notes are hidden from the free-form canvas and instead surfaced through a dedicated modal gallery (grid of sticky cards, position ignored, tap to open/edit).

## 5. Organizational Entities

### 5.1 Notebooks

```ts
interface Notebook {
  id: string;
  folderId: string | null;
  title: string;
  defaultNoteTypeId: string | null;
  encryption: { enabled: boolean; salt?: string } | null; // PBKDF2 salt if enabled
}
```

- New notes in a notebook default to `defaultNoteTypeId` but any type may be chosen at creation.
- Notebooks support querying/filtering their notes by tag, property value, note type, and free-text (via §6 Search, scoped to the notebook).
- Optional password encryption — see §7.

### 5.2 Folders

```ts
interface Folder {
  id: string;
  parentFolderId: string | null; // unlimited nesting
  title: string;
}
```

Folders may contain Notebooks, Boards, and other Folders, with no depth limit. The sidebar tree/breadcrumb UI must handle arbitrary depth (virtualized rendering if needed at deep nesting + high sibling counts, per the power-user scale target in §13).

### 5.3 Boards

```ts
interface Board {
  id: string;
  folderId: string | null;
  title: string;
  columns: BoardColumn[];
}
interface BoardColumn {
  id: string; name: string; tag: string; color: string; visible: boolean;
}
```

- Every Note created inside a Board gets a `status` property whose value maps to exactly one `BoardColumn.id`.
- Board-specific note fields: optional `description`, optional card `image` (OPFS reference) shown in card mode. Otherwise board notes are ordinary Notes with the full block/metadata model.
- Board card ordering and column assignment live in the Board's `Y.Doc`; dnd-kit drives drag-and-drop between/within columns.
- Boards support filtering and toggling column visibility, and have their own set of Sticky Notes (§4.6).
- Boards can be organized inside Folders, same as Notebooks.

## 6. Search

FlexSearch powers offline full-text search:

- An in-memory FlexSearch index is built on load from Dexie's projected fields (title, tags, stringified property values) and kept warm; it is persisted (serialized) so subsequent loads don't require a full rebuild — designed for **thousands of notes** without a noticeable cold-start delay.
- The index is updated incrementally: any Dexie write to a note's projected fields patches the index rather than triggering a full reindex.
- Search is available scoped to a single Notebook/Board (via the query/filter UI in §5.1) and globally across the whole workspace.
- Note Block **content** (TipTap text, code, table cells) is included in the index by extracting plain text from each block on save; sketches and images are not full-text searchable in v1.

## 7. Encryption

Two independent encryption mechanisms, both using the Web Crypto API:

1. **Per-notebook password protection** (optional, user-initiated): a password is run through PBKDF2 to derive an AES-GCM key; the notebook's Dexie-projected fields and its notes' `Y.Doc` blobs are encrypted at rest with that key. Locked notebooks require the password to decrypt before their content can be viewed/edited each session (an unlocked session persists in memory only, never written to storage in plaintext or as a recoverable derived key).
2. **Always-on sync/device key** (independent of #1): because sync must be end-to-end encrypted regardless of whether an individual notebook has a password, every device holds a separate **sync key**. This key encrypts *all* outgoing WebRTC/Firebase payloads and decrypts incoming ones — Firebase and any WebRTC peer only ever see ciphertext, even for notebooks with no password set. The sync key is established during pairing:
   - **WebRTC pairing**: exchanged as part of the manual offer/answer handshake (see §9.1).
   - **Firebase setup**: generated on first device and re-entered (or QR-scanned) on subsequent devices during their Firebase configuration step.

Notebook passwords and the sync key are deliberately separate concerns: a user can sync without ever password-protecting a notebook, and can password-protect a notebook without ever configuring sync.

## 8. Import/Export

Export produces a **zip archive**, not a single self-contained JSON:

```
notebuddy-export-<timestamp>.zip
├── manifest.json     # schema version, folders/notebooks/boards/notes, metadata, custom type defs
└── assets/
    ├── <opfs-path-1>
    ├── <opfs-path-2>
    └── ...
```

- `manifest.json` includes a `schemaVersion` field from day one so future format changes can be migrated on import.
- Encrypted notebooks export their content still encrypted (the password is required at import time to decrypt, or the user may choose to export decrypted — exact UX flag is a §13 open item).
- Import validates `schemaVersion` and asset references before merging into the local Dexie/OPFS/Yjs stores, and reports conflicts (e.g. an id collision) rather than silently overwriting.

## 9. Sync

Both sync mechanisms move Yjs update sets between peers; the receiving side applies them via `Y.applyUpdate`, so merges are automatic (per the CRDT decision in §3/§4).

### 9.1 WebRTC Sync

- No signaling server. Pairing is manual: Device A generates a connection **offer** (displayed as text and as a QR code), Device B scans/pastes it and generates an **answer** (text/QR) that Device A then enters. Once the data channel is open, the sync key (§7) is exchanged as part of this same handshake.
- Over the data channel, peers exchange encrypted Yjs update batches for the notebooks/boards selected for sync.
- This mechanism works entirely without Firebase and without any account.

### 9.2 Firebase Cloud Sync

- The app ships with no Firebase config baked in. Users who want cloud sync create their own Firebase project and paste its config into Notebuddy's settings.
- Sync is **manual only** — a "Sync now" button uploads locally-changed encrypted Yjs updates and downloads/applies any new encrypted updates from Firestore. No background listeners, no automatic push/pull.
- If the user doesn't want Firebase, file export/import and WebRTC remain fully viable alternatives (per the pitch).

## 10. PWA & Offline Behavior

- `vite-plugin-pwa` in `generateSW`/Workbox mode, configured for **full app-shell precaching**: the entire built app (JS/CSS/fonts/icons) is precached on install so the app works completely offline from the very first successful load.
- Standard PWA installability (manifest.json, icons, `display: standalone`).
- Update flow: new versions are detected via Workbox's update lifecycle and the user is prompted to reload to activate, rather than silently swapping content under them.

## 11. Design System & Theming

- Visual direction: **subtle, tasteful nods** to physical notebooks/journals — warm paper-inspired palette, soft shadows, comfortable serif/humanist typography for note content — without literal paper textures or skeuomorphic decoration. This keeps the UI clean on mobile and easy to maintain.
- **Light and dark themes from day one**, implemented as CSS custom-property token sets (CSS Modules reference the tokens, never hardcoded colors). A theme toggle supports Light / Dark / **Match system** (via `prefers-color-scheme`), persisted in settings.
- Layout adapts across desktop, tablet, and mobile breakpoints; sticky notes in particular have a distinct mobile behavior (§4.6).

## 12. Testing Strategy

- **Vitest** for unit tests: data model logic (custom type schema validation, Note Type blueprint application), Yjs merge behavior (simulated concurrent updates applied in different orders produce the same end state), encryption round-trips (PBKDF2 derivation + AES-GCM encrypt/decrypt), search indexing (incremental update correctness).
- **React Testing Library** for component tests: block editor interactions, notebook/board filtering UI, sticky note drag behavior (via simulated pointer events), theme switching.
- No end-to-end browser test suite in v1; can be added in a later phase if needed.

## 13. Open Questions / Assumed Defaults

These were not explicitly discussed and are given a reasonable default here — flagged so they can be revisited:

- **Internal note links**: whether the `link` data type (or a future block type) should support linking to another Note by id (wiki-link style), in addition to external URLs. *Default assumed: external URL only in v1.*
- **Exact color palette / spacing scale values** for the design-token system. *Default: to be defined during Phase 0 as a small, deliberately limited palette (not user-specified yet).*
- **Responsive breakpoint pixel values** for desktop/tablet/mobile. *Default: standard 768px / 1024px-ish breakpoints, refined during implementation.*
- **Encrypted-notebook export UX**: export encrypted-as-is vs. offer a decrypt-on-export option. *Default: export stays encrypted; a decrypt option can be added later.*
- **Undo/redo scope**: whether undo is per-block, per-note, or global. *Default: rely on TipTap's built-in undo for text blocks in v1; cross-block undo is out of scope.*
- **Select-option management UI** details (reordering/deleting options in use). *Default: basic add/remove/reorder list, no special handling for in-use-value deletion beyond leaving existing values as-is.*
