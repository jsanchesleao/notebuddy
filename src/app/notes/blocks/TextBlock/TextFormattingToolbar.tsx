import type { Editor } from '@tiptap/core'
import { Icon } from '../../../../components/Icon/Icon'
import { TEXT_COLOR_PRESETS } from './textColorPresets'
import styles from './TextFormattingToolbar.module.css'

interface TextFormattingToolbarProps {
  editor: Editor
}

export function TextFormattingToolbar({ editor }: TextFormattingToolbarProps) {
  return (
    <div className={styles.toolbar}>
      <button
        type="button"
        className={styles.button}
        aria-label="Bold"
        aria-pressed={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Icon name="bold" size={14} />
      </button>
      <button
        type="button"
        className={styles.button}
        aria-label="Italic"
        aria-pressed={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Icon name="italic" size={14} />
      </button>
      <button
        type="button"
        className={styles.button}
        aria-label="Underline"
        aria-pressed={editor.isActive('underline')}
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
          aria-pressed={editor.isActive('textStyle', { color: value })}
          style={{ backgroundColor: value }}
          onClick={() => editor.chain().focus().setColor(value).run()}
        />
      ))}
      <button
        type="button"
        className={styles.removeColorButton}
        aria-label="Remove color"
        onClick={() => editor.chain().focus().unsetColor().run()}
      >
        <Icon name="close" size={12} />
      </button>
    </div>
  )
}
