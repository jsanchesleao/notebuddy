import { useEffect, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { StarterKit } from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import type { JSONContent } from '@tiptap/core'
import type { NoteBlock, NoteBlockType } from '../../../../domain/blocks/blocks.types'
import { TextFormattingToolbar } from './TextFormattingToolbar'
import { SlashCommandMenu } from './SlashCommandMenu'
import { parseSlashQuery } from './slashCommand'
import styles from './TextBlock.module.css'

const SAVE_DEBOUNCE_MS = 500

interface TextBlockProps {
  block: Extract<NoteBlock, { type: 'text' }>
  onUpdate: (patch: { content: JSONContent }) => void
  onConvert: (type: NoteBlockType) => void
}

export function TextBlock({ block, onUpdate, onConvert }: TextBlockProps) {
  const onUpdateRef = useRef(onUpdate)
  const onConvertRef = useRef(onConvert)
  useEffect(() => {
    onUpdateRef.current = onUpdate
    onConvertRef.current = onConvert
  })
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasPendingSaveRef = useRef(false)
  const [slashQuery, setSlashQuery] = useState<string | null>(null)

  // `deps` defaults to `[]`, so this editor instance is created once on mount;
  // `block.content` is only ever read as the initial value, never re-applied.
  const editor = useEditor({
    extensions: [StarterKit, TextStyle, Color],
    content: block.content,
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

  return (
    <div className={styles.textBlock}>
      {editor && (
        <BubbleMenu editor={editor} shouldShow={({ state }) => !state.selection.empty}>
          <TextFormattingToolbar editor={editor} />
        </BubbleMenu>
      )}
      <EditorContent editor={editor} />
      {slashQuery !== null && (
        <SlashCommandMenu
          query={slashQuery}
          onSelect={(type) => {
            setSlashQuery(null)
            // Discard any pending debounced save from the "/xxx" text itself —
            // otherwise the unmount-flush effect below would fire it after
            // conversion, appending a second, stale block (e.g. via the
            // trailing phantom's `appendBlock`, which has no id-based guard
            // the way `updateBlock` does for converting an existing block).
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
            hasPendingSaveRef.current = false
            onConvertRef.current(type)
          }}
          onClose={() => setSlashQuery(null)}
        />
      )}
    </div>
  )
}
