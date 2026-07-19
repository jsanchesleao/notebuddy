import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { TextAlign } from '@tiptap/extension-text-align'
import type { JSONContent } from '@tiptap/core'
import { Selection } from '@tiptap/pm/state'
import type { NoteBlock, NoteBlockType } from '../../../../domain/blocks/blocks.types'
import { TextFormattingToolbar } from './TextFormattingToolbar'
import { SlashCommandMenu } from './SlashCommandMenu'
import { parseSlashQuery } from './slashCommand'
import styles from './TextBlock.module.css'

const SAVE_DEBOUNCE_MS = 500

export type BlockEdge = 'start' | 'end'

const ARROW_KEYS: Record<string, { dir: 'up' | 'down' | 'left' | 'right'; edge: BlockEdge }> = {
  ArrowUp: { dir: 'up', edge: 'start' },
  ArrowLeft: { dir: 'left', edge: 'start' },
  ArrowDown: { dir: 'down', edge: 'end' },
  ArrowRight: { dir: 'right', edge: 'end' },
}

export interface TextBlockHandle {
  focusStart: () => void
  focusEnd: () => void
  getContent: () => JSONContent
  // Appends `content`'s nodes to the end of this block's doc and places the
  // cursor at the join point (where this block's original content used to
  // end). Used to implement cross-block text merging on Backspace/Delete.
  appendContent: (content: JSONContent) => void
}

interface TextBlockProps {
  block: Extract<NoteBlock, { type: 'text' }>
  onUpdate: (patch: { content: JSONContent }) => void
  onConvert: (type: NoteBlockType) => void
  // Optional: the trailing phantom block has no "next block" to create — Enter
  // there just flushes the pending save below, which already promotes it via
  // `onUpdate`/`onPromote`. Passing `onSplit` too would double up that reset.
  onSplit?: () => void
  // Fired when Up/Left (edge 'start') or Down/Right (edge 'end') is pressed
  // while the cursor is already at that visual boundary of the block's
  // content — i.e. the key press has nowhere left to go within this block.
  // `extendSelection` mirrors the key's shiftKey state.
  onEscape?: (edge: BlockEdge, extendSelection: boolean) => void
  // Fired on Backspace when the (collapsed) selection is at the very start of
  // the block. `isEmpty` distinguishes "delete this block" from "merge this
  // block's content into the previous one".
  onBackspaceAtStart?: (isEmpty: boolean, content: JSONContent) => void
  // Fired on Delete when the (collapsed) selection is at the very end of the
  // block — the forward-merge counterpart of `onBackspaceAtStart`.
  onDeleteAtEnd?: () => void
  ref?: Ref<TextBlockHandle>
}

export function TextBlock({
  block,
  onUpdate,
  onConvert,
  onSplit,
  onEscape,
  onBackspaceAtStart,
  onDeleteAtEnd,
  ref,
}: TextBlockProps) {
  const onUpdateRef = useRef(onUpdate)
  const onConvertRef = useRef(onConvert)
  const onSplitRef = useRef(onSplit)
  const onEscapeRef = useRef(onEscape)
  const onBackspaceAtStartRef = useRef(onBackspaceAtStart)
  const onDeleteAtEndRef = useRef(onDeleteAtEnd)
  const [slashQuery, setSlashQuery] = useState<string | null>(null)
  const slashQueryRef = useRef(slashQuery)
  const [isFocused, setIsFocused] = useState(false)
  useEffect(() => {
    onUpdateRef.current = onUpdate
    onConvertRef.current = onConvert
    onSplitRef.current = onSplit
    onEscapeRef.current = onEscape
    onBackspaceAtStartRef.current = onBackspaceAtStart
    onDeleteAtEndRef.current = onDeleteAtEnd
    slashQueryRef.current = slashQuery
  })
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasPendingSaveRef = useRef(false)

  // `deps` defaults to `[]`, so this editor instance is created once on mount;
  // `block.content` is only ever read as the initial value, never re-applied.
  const editor = useEditor({
    extensions: [
      // `trailingNode` auto-appends an invisible empty paragraph after any
      // block content whose type isn't the default (e.g. after a list or
      // heading) — meant for editors where users click below content to keep
      // typing in the same doc. Each NoteBlock is its own self-contained doc
      // here (continuing after one always creates a new sibling block via
      // `onSplit`), so that trailing node is never useful and would otherwise
      // sit between list content and the doc's real end, breaking end-of-doc
      // checks like the one arrow-key escape relies on below.
      StarterKit.configure({ trailingNode: false }),
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: block.content,
    editorProps: {
      // Root-level editorProps are checked before any extension's keymap
      // (StarterKit's default Enter -> splitBlock), so this reliably wins.
      // Shift+Enter is left untouched and falls through to StarterKit's
      // default hard-break binding.
      handleKeyDown: (view, event) => {
        // Let the slash-command menu's own keyboard handling (navigate/select
        // the menu, or edit the "/xxx" query text) win over all of the below.
        if (slashQueryRef.current !== null) return false

        const flushPendingSave = () => {
          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
          if (hasPendingSaveRef.current) {
            hasPendingSaveRef.current = false
            onUpdateRef.current({ content: editor.getJSON() })
          }
        }

        if (event.key === 'Enter' && !event.shiftKey) {
          // Inside a list item, defer to StarterKit's own Enter -> splitListItem
          // keymap for the cases it handles (non-empty item: new sibling item;
          // empty nested item: lift one level) — `can()` dry-runs the command to
          // tell them apart from the one case it deliberately no-ops on: an
          // empty, non-nested (top-level) item, which falls through below to end
          // the block like normal.
          if (editor.isActive('listItem')) {
            if (editor.can().splitListItem('listItem')) return false
            // Empty, top-level item: un-list it into a plain paragraph in place
            // (the same liftListItem command ListKeymap's Backspace-exit path
            // already uses below) before ending the block as normal — otherwise
            // the emptied bullet/number marker is left behind.
            editor.chain().focus().liftListItem('listItem').run()
          }
          event.preventDefault()
          // Flush any pending edit immediately rather than waiting on the debounce,
          // so nothing typed just before Enter is lost. For the trailing phantom
          // this also runs the existing promote-to-real-block flow via `onUpdate`.
          flushPendingSave()
          onSplitRef.current?.()
          return true
        }

        const noModifiers = !event.altKey && !event.metaKey && !event.ctrlKey

        if (noModifiers && event.key in ARROW_KEYS) {
          const { dir, edge } = ARROW_KEYS[event.key]
          // `endOfTextblock` accounts for wrapped visual lines, so plain
          // in-block movement (multi-line content) keeps working normally —
          // only the true first/last line triggers cross-block navigation.
          if (!view.endOfTextblock(dir)) return false
          // `endOfTextblock` only looks at the nearest textblock ancestor, not
          // the whole doc — a list's items are each their own textblock, so
          // being at the edge of one doesn't mean there's no sibling item left
          // to move into. Only escape to the adjacent block once the current
          // textblock is truly the first/last one in the whole document —
          // compared by textblock boundary (`.start()`/`.end()`), not raw
          // cursor position, since arriving via Up/Down can land anywhere
          // along a short first/last line, not just its very first character.
          const { selection, doc } = editor.state
          const atDocEdge =
            edge === 'start'
              ? selection.$from.start() === Selection.atStart(doc).$from.start()
              : selection.$to.end() === Selection.atEnd(doc).$to.end()
          if (!atDocEdge) return false
          event.preventDefault()
          onEscapeRef.current?.(edge, event.shiftKey)
          return true
        }

        if (noModifiers && !event.shiftKey && event.key === 'Backspace') {
          // Inside a list item, defer to the ListKeymap extension's own
          // Backspace handling (outdent one level, or dissolve to a plain
          // paragraph if already top-level) before the cross-block merge check
          // below — otherwise the first item's Backspace-at-doc-start would
          // always merge into the previous block instead of decreasing nesting.
          if (editor.isActive('listItem')) return false

          const { selection, doc } = editor.state
          if (!selection.empty || selection.from !== Selection.atStart(doc).from) return false
          event.preventDefault()
          const isEmpty = editor.isEmpty
          flushPendingSave()
          onBackspaceAtStartRef.current?.(isEmpty, editor.getJSON())
          return true
        }

        if (noModifiers && !event.shiftKey && event.key === 'Delete') {
          const { selection, doc } = editor.state
          if (!selection.empty || selection.from !== Selection.atEnd(doc).from) return false
          event.preventDefault()
          flushPendingSave()
          onDeleteAtEndRef.current?.()
          return true
        }

        return false
      },
    },
    onUpdate: ({ editor }) => {
      setSlashQuery(parseSlashQuery(editor.getText()))

      hasPendingSaveRef.current = true
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = setTimeout(() => {
        hasPendingSaveRef.current = false
        onUpdateRef.current({ content: editor.getJSON() })
      }, SAVE_DEBOUNCE_MS)
    },
  })

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
      if (hasPendingSaveRef.current && editor && !editor.isDestroyed) {
        onUpdateRef.current({ content: editor.getJSON() })
      }
    }
  }, [editor])

  useEffect(() => {
    if (!editor) return

    const handleFocus = () => setIsFocused(true)
    const handleBlur = () => setIsFocused(false)
    editor.on('focus', handleFocus)
    editor.on('blur', handleBlur)
    return () => {
      editor.off('focus', handleFocus)
      editor.off('blur', handleBlur)
    }
  }, [editor])

  useImperativeHandle(
    ref,
    () => ({
      focusStart: () => {
        if (!editor) return
        editor.chain().focus().setTextSelection(Selection.atStart(editor.state.doc).from).run()
      },
      focusEnd: () => {
        if (!editor) return
        editor.chain().focus().setTextSelection(Selection.atEnd(editor.state.doc).from).run()
      },
      getContent: () => editor?.getJSON() ?? { type: 'doc', content: [{ type: 'paragraph' }] },
      appendContent: (content) => {
        if (!editor) return
        const incomingNodes = content.content ?? []
        const joinPos = Selection.atEnd(editor.state.doc).from

        if (incomingNodes.length > 0) {
          const [firstIncoming, ...restIncoming] = incomingNodes
          const lastNode = editor.state.doc.lastChild
          // If the boundary nodes are the same kind of textblock (the common
          // case: two plain paragraphs), flatten their inline content into a
          // single continuous paragraph instead of leaving two block nodes
          // back-to-back — this is what makes the merge feel like a normal
          // Backspace-merge rather than just concatenating two blocks.
          const canJoinInline = lastNode?.isTextblock && firstIncoming.type === lastNode.type.name

          if (canJoinInline) {
            editor.commands.insertContentAt(joinPos, firstIncoming.content ?? [])
            if (restIncoming.length > 0) {
              editor.commands.insertContentAt(editor.state.doc.content.size, restIncoming)
            }
          } else {
            editor.commands.insertContentAt(joinPos, incomingNodes)
          }

          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
          hasPendingSaveRef.current = false
          onUpdateRef.current({ content: editor.getJSON() })
        }

        editor.chain().focus().setTextSelection(joinPos).run()
      },
    }),
    [editor],
  )

  return (
    <div className={styles.textBlock}>
      {editor && isFocused && (
        <div className={styles.pinnedToolbar}>
          <TextFormattingToolbar editor={editor} />
        </div>
      )}
      <EditorContent editor={editor} />
      {editor && slashQuery !== null && (
        <SlashCommandMenu
          query={slashQuery}
          onSelect={(entry) => {
            setSlashQuery(null)
            // Discard any pending debounced save from the "/xxx" text itself —
            // otherwise the unmount-flush effect below would fire it after
            // conversion, appending a second, stale block (e.g. via the
            // trailing phantom's `appendBlock`, which has no id-based guard
            // the way `updateBlock` does for converting an existing block).
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
            hasPendingSaveRef.current = false

            if (entry.kind === 'blockType') {
              onConvertRef.current(entry.type)
              return
            }

            // Text-format entries (headings, lists, citation) stay within the
            // current block — remove the "/query" text the whole block's
            // content consists of, apply the formatting command, then save.
            const queryStart = Selection.atStart(editor.state.doc).from
            const queryEnd = editor.state.selection.from
            editor.chain().focus().deleteRange({ from: queryStart, to: queryEnd }).run()
            entry.apply(editor)
            // `deleteRange`/`apply` are themselves doc-mutating transactions,
            // so the editor's own `onUpdate` re-armed the debounced save while
            // they ran — clear it again before saving explicitly below, or
            // the leftover timer fires a second, stale save shortly after
            // (double-appending via the trailing phantom's `onPromote`).
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
            hasPendingSaveRef.current = false
            onUpdateRef.current({ content: editor.getJSON() })
          }}
          onClose={() => setSlashQuery(null)}
        />
      )}
    </div>
  )
}
