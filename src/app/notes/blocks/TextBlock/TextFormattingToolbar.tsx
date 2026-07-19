import type { MouseEvent } from 'react'
import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import { Icon } from '../../../../components/Icon/Icon'
import { BlockTypeSelect } from './BlockTypeSelect'
import { TEXT_COLOR_PRESETS } from './textColorPresets'
import styles from './TextFormattingToolbar.module.css'

interface TextFormattingToolbarProps {
  editor: Editor
}

const ALIGNMENTS = [
  { value: 'left', label: 'Align left', icon: 'alignLeft' },
  { value: 'center', label: 'Align center', icon: 'alignCenter' },
  { value: 'right', label: 'Align right', icon: 'alignRight' },
  { value: 'justify', label: 'Align justify', icon: 'alignJustify' },
] as const

const preventMouseDownDefault = (event: MouseEvent) => event.preventDefault()

export function TextFormattingToolbar({ editor }: TextFormattingToolbarProps) {
  // `editor.isActive(...)` reads a live snapshot, but plain prop-drilled
  // reads don't by themselves cause this component to re-render when the
  // editor's selection/marks change (there's no BubbleMenu here anymore to
  // force that). `useEditorState` subscribes to the editor and re-renders
  // this component whenever the selected slice actually changes.
  const { isBold, isItalic, isUnderline, activeColor, align } = useEditorState({
    editor,
    selector: ({ editor }) => ({
      isBold: editor.isActive('bold'),
      isItalic: editor.isActive('italic'),
      isUnderline: editor.isActive('underline'),
      activeColor: editor.getAttributes('textStyle').color as string | undefined,
      align: ALIGNMENTS.find(({ value }) => editor.isActive({ textAlign: value }))?.value,
    }),
  })

  return (
    <div className={styles.toolbar}>
      <BlockTypeSelect editor={editor} />
      <div className={styles.divider} />
      <button
        type="button"
        className={styles.button}
        aria-label="Bold"
        aria-pressed={isBold}
        onMouseDown={preventMouseDownDefault}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Icon name="bold" size={14} />
      </button>
      <button
        type="button"
        className={styles.button}
        aria-label="Italic"
        aria-pressed={isItalic}
        onMouseDown={preventMouseDownDefault}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Icon name="italic" size={14} />
      </button>
      <button
        type="button"
        className={styles.button}
        aria-label="Underline"
        aria-pressed={isUnderline}
        onMouseDown={preventMouseDownDefault}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <Icon name="underline" size={14} />
      </button>
      <div className={styles.divider} />
      {TEXT_COLOR_PRESETS.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          className={styles.swatch}
          aria-label={label}
          aria-pressed={activeColor === value}
          style={{ backgroundColor: value }}
          onMouseDown={preventMouseDownDefault}
          onClick={() => editor.chain().focus().setColor(value).run()}
        />
      ))}
      <button
        type="button"
        className={styles.removeColorButton}
        aria-label="Remove color"
        onMouseDown={preventMouseDownDefault}
        onClick={() => editor.chain().focus().unsetColor().run()}
      >
        <Icon name="close" size={12} />
      </button>
      <div className={styles.divider} />
      {ALIGNMENTS.map(({ value, label, icon }) => (
        <button
          key={value}
          type="button"
          className={styles.button}
          aria-label={label}
          aria-pressed={align === value}
          onMouseDown={preventMouseDownDefault}
          onClick={() => editor.chain().focus().setTextAlign(value).run()}
        >
          <Icon name={icon} size={14} />
        </button>
      ))}
    </div>
  )
}
