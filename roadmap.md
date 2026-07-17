# Notebuddy — Implementation Roadmap

Ordering principle: **every phase through Phase 8 must work with zero network connectivity.** WebRTC sync and Firebase cloud sync are deliberately the last two phases — nothing about offline usability should ever wait on them.

Each phase assumes the previous ones are done. "Acceptance" is what should be demonstrably true (in the running app or test suite) before moving on.

---

## Phase 0 — Project Scaffolding

- Vite + React + TypeScript project setup; ESLint + Prettier configured.
- CSS Modules + initial design-token stylesheet (colors, spacing, typography scale) for light and dark themes.
- Vitest + React Testing Library wired up with a sample passing test.
- `vite-plugin-pwa` configured for full app-shell precaching (Workbox `generateSW`), manifest.json, icons.
- Base app shell: routing, top-level layout (sidebar for Folders/Notebooks/Boards + main content area), theme toggle (Light/Dark/Match system) wired to `prefers-color-scheme` and persisted setting.

**Acceptance**: app builds, installs as a PWA, loads and reloads with the network disabled (DevTools offline mode), theme toggle works and persists.

## Phase 1 — Core Offline Data Layer

- Dexie schema: `folders`, `notebooks`, `boards`, `notes` (index/metadata projection), `settings`, `yjsUpdates`.
- OPFS wrapper module: write/read/delete binary files, path scheme for assets.
- Per-note `Y.Doc` lifecycle: create, load (replay `yjsUpdates` blobs), append new updates, periodic compaction/snapshot.
- Basic CRUD (no rich block editor yet — plain title + empty content) for Folders, Notebooks, Notes, so the storage layer is exercised end-to-end.

**Acceptance**: create a folder → notebook → note, reload the page, data persists via Dexie/OPFS with no network. Unit tests cover Yjs update persistence/replay round-trip.

## Phase 2 — Note Blocks & Editor

- TipTap integration for the `text` block type; note content renders as the "seamless page" described in the pitch.
- Block model: ordered `Y.Array` of blocks, drag-to-reorder UI.
- `image` block (OPFS-backed), `sketch` block (canvas + `perfect-freehand`), `code` block (textarea + Prism overlay), `table` block (custom grid component), `embed` block (OPFS files).
- Block insertion UI (add block of a given type at a position).

**Acceptance**: a note can contain a mix of all six block types, blocks can be reordered, and content survives reload offline. Component tests cover block reordering and each block type's basic edit interaction.

## Phase 3 — Metadata & Custom Data Types

- Primitive data type editors/renderers: text, date, time, datetime, boolean, number, select (with option management), link (external URL), color (swatch/wheel picker).
- Custom Data Type visual schema builder: compose List/Set/Tuple/Dictionary from primitives (and from other custom types), with live preview of the resulting shape.
- Property storage/validation against a custom type's schema when saving a note's metadata.
- Note Types: define a blueprint from a Dictionary custom type; note-creation flow offers "create as type X" and pre-fills properties (soft template — no post-creation enforcement).

**Acceptance**: a user can define a custom Dictionary type nesting a List of Tuples, save it as a Note Type, create a note from it with pre-filled properties, then freely add an extra ad hoc property with no validation error. Unit tests cover schema validation logic for each composite kind.

## Phase 4 — Organizational Structures

- Notebooks: default note type selection, notebook-scoped query/filter UI (by tag, property, note type).
- Folders: nested folder tree UI (sidebar), breadcrumbs, unlimited depth navigation.
- Boards: column CRUD (name/tag/color), dnd-kit-powered card drag between/within columns, column visibility toggle, board-scoped filtering. Board notes get `status`/optional `description`/optional card `image`.
- Sticky Notes: free-form drag-and-drop (no snapping) on Notebook and Board canvases, predefined color palette, text-or-sketch content; mobile breakpoint switches to the gallery modal.

**Acceptance**: full org hierarchy usable — folder containing a notebook and a board, notes filterable within each, kanban drag-and-drop reorders/reassigns columns, sticky notes placed freely on desktop and shown as a gallery on a mobile viewport size.

## Phase 5 — Search

- FlexSearch index built from Dexie-projected fields + extracted block plain text.
- Incremental index updates wired to note/block save paths (no full rebuilds on every keystroke).
- Search UI: notebook/board-scoped search and a global search view, with persisted (serialized) index for fast reload.

**Acceptance**: searching finds matches in titles, tags, property values, and block text across thousands of seeded notes with no perceptible lag, fully offline; index survives reload without a full rebuild.

## Phase 6 — Notebook Encryption

- PBKDF2 key derivation from a user-entered notebook password; AES-GCM encryption of the notebook's Dexie-projected fields and its notes' Yjs blobs at rest.
- Lock/unlock UX: locked notebooks prompt for password before content is decrypted into memory; unlock state is session-only (in-memory), never persisted in recoverable form.

**Acceptance**: a password-protected notebook's data is unreadable in Dexie/OPFS without the password (verified by inspecting storage directly), unlocks correctly with the right password, and rejects the wrong one. Unit tests cover the PBKDF2/AES-GCM round-trip.

## Phase 7 — Import/Export

- Export: zip archive with `manifest.json` (schema-versioned) + `assets/` folder of referenced OPFS files.
- Import: validates `schemaVersion`, resolves/copies assets into OPFS, merges entities into Dexie/Yjs stores, reporting id collisions instead of silently overwriting.

**Acceptance**: exporting and re-importing (into a fresh/empty instance) reproduces an identical folder/notebook/board/note structure including images and sketches, fully offline.

## Phase 8 — Polish Pass (pre-sync)

- Accessibility pass (keyboard navigation, focus management, ARIA on custom controls like the drag-and-drop board and sticky notes).
- Performance/virtualization for large lists (thousands of notes, deep folder trees) — virtualized rendering where needed.
- PWA update-available prompt flow refined; dark/light token refinement based on real usage across all the built screens.

**Acceptance**: app remains responsive with a seeded dataset of several thousand notes; keyboard-only navigation can reach all primary actions; PWA update prompt appears correctly after a new deploy.

---

*Everything above this line is a complete, usable, fully offline product. The two phases below add optional multi-device sync and are intentionally last.*

---

## Phase 9 — WebRTC Sync

- Sync key generation (device-local) and the manual pairing flow: Device A produces an offer (text + QR), Device B consumes it and produces an answer (text + QR), Device A completes the handshake; sync key exchanged as part of this process.
- Data channel transport of encrypted Yjs update batches for user-selected notebooks/boards; `Y.applyUpdate` on receipt.
- UI for choosing what to sync and confirming a peer pairing before any data moves.

**Acceptance**: two browser instances (or two devices) pair via manual offer/answer/QR with no server involved, and edits made offline on one merge correctly into the other once paired, without either side ever transmitting plaintext.

## Phase 10 — Firebase Cloud Sync

- Firebase config entry UI (user pastes their own project config); no config baked into the app.
- Sync key setup/entry for additional devices (matching the key established on the first device).
- Manual "Sync now" action: uploads locally-changed encrypted Yjs updates, downloads and applies new encrypted updates from Firestore. No background listeners.

**Acceptance**: with a real user-owned Firebase project configured, "Sync now" round-trips encrypted updates between two devices/browsers; Firestore's stored documents are verified to contain only ciphertext; the app remains fully functional with Firebase never configured at all.
