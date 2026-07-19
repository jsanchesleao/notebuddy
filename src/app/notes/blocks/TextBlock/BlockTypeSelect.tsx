import type { Editor } from '@tiptap/core'
import { useEditorState } from '@tiptap/react'
import { Icon } from '../../../../components/Icon/Icon'
import { useDismissableMenu } from '../../../../components/Menu/useDismissableMenu'
import { TEXT_BLOCK_TYPE_OPTIONS, getActiveTextBlockTypeOption } from './textBlockTypeOptions'
import styles from './BlockTypeSelect.module.css'

interface BlockTypeSelectProps {
  editor: Editor
}

export function BlockTypeSelect({ editor }: BlockTypeSelectProps) {
  const { open, setOpen, containerRef } = useDismissableMenu<HTMLDivElement>()
  // Prop-drilled `editor` reads don't by themselves trigger a re-render when
  // the editor's active node type changes, so subscribe explicitly to keep
  // the trigger label and each menu item's pressed state live.
  const { activeKey } = useEditorState({
    editor,
    selector: ({ editor }) => ({ activeKey: getActiveTextBlockTypeOption(editor)?.key }),
  })
  // No option to show as "checked" when the selection spans multiple block
  // types (e.g. a Ctrl+A covering a heading and its trailing paragraph) — the
  // trigger falls back to a neutral label rather than a specific, wrong one.
  const active = TEXT_BLOCK_TYPE_OPTIONS.find((option) => option.key === activeKey)

  return (
    <div className={styles.container} ref={containerRef}>
      <button
        type="button"
        className={styles.trigger}
        aria-label="Block type"
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen(!open)}
      >
        <Icon name={active?.icon ?? 'paragraph'} size={14} />
        <span className={styles.triggerLabel}>{active?.label ?? 'Text'}</span>
        <Icon name="chevronDown" size={12} />
      </button>
      {open && (
        <div role="menu" className={styles.menu}>
          {TEXT_BLOCK_TYPE_OPTIONS.map((option) => (
            <button
              key={option.key}
              type="button"
              role="menuitemradio"
              aria-checked={option.key === activeKey}
              className={styles.menuItem}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                option.apply(editor)
                setOpen(false)
              }}
            >
              <Icon name={option.icon} size={14} /> {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
