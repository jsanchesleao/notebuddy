import { useState } from 'react'
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core'
import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import { Icon } from '../../components/Icon/Icon'
import { PILL_PALETTE } from '../../domain/tags/tagPalette'
import { HEX_COLOR_REGEX } from '../../lib/color/hexColor'
import styles from './StickyNoteColorPicker.module.css'

interface StickyNoteColorPickerProps {
  color: string
  onChangeColor: (color: string) => void
  onOpen: () => void
  textColor: string
  attributes: DraggableAttributes
  listeners: DraggableSyntheticListeners
}

// The grip button doubles as both the drag handle (dnd-kit attributes/listeners, spread here)
// and the color-picker trigger — a click with no pointer movement falls through to a normal
// click event since PointerSensor only activates a drag past its distance threshold, so the
// two behaviors coexist on one button rather than needing separate controls.
export function StickyNoteColorPicker({
  color,
  onChangeColor,
  onOpen,
  textColor,
  attributes,
  listeners,
}: StickyNoteColorPickerProps) {
  const [draft, setDraft] = useState(color)

  return (
    <DismissableDropdown
      trigger={({ toggle, open }) => (
        <button
          type="button"
          className={styles.gripButton}
          style={{ color: textColor }}
          aria-label="Move or change color of sticky note"
          aria-expanded={open}
          onClick={() => {
            setDraft(color)
            if (!open) onOpen()
            toggle()
          }}
          {...attributes}
          {...listeners}
        >
          <Icon name="grip" size={12} />
        </button>
      )}
    >
      {({ close }) => (
        <div className={styles.picker}>
          <div className={styles.swatchGrid}>
            {PILL_PALETTE.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className={styles.swatch}
                style={{ background: swatch }}
                aria-label={swatch}
                aria-pressed={swatch === color}
                onClick={() => {
                  onChangeColor(swatch)
                  close()
                }}
              />
            ))}
          </div>
          <form
            className={styles.hexForm}
            onSubmit={(event) => {
              event.preventDefault()
              if (!HEX_COLOR_REGEX.test(draft)) return
              onChangeColor(draft)
              close()
            }}
          >
            <input
              type="text"
              value={draft}
              placeholder="#rrggbb"
              onChange={(event) => setDraft(event.target.value)}
              aria-label="Hex color"
            />
            <button type="submit" disabled={!HEX_COLOR_REGEX.test(draft)}>
              Set
            </button>
          </form>
        </div>
      )}
    </DismissableDropdown>
  )
}
