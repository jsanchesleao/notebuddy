import { useState } from 'react'
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
}

// The whole card is the drag surface (StickyNoteItem), so this button only opens the color
// picker — it stops propagation so the click doesn't also bubble up to the card's
// click-to-edit handler.
export function StickyNoteColorPicker({
  color,
  onChangeColor,
  onOpen,
  textColor,
}: StickyNoteColorPickerProps) {
  const [draft, setDraft] = useState(color)

  return (
    <DismissableDropdown
      trigger={({ toggle, open }) => (
        <button
          type="button"
          className={styles.gripButton}
          style={{ color: textColor }}
          aria-label="Change sticky note color"
          aria-expanded={open}
          onClick={(event) => {
            event.stopPropagation()
            setDraft(color)
            if (!open) onOpen()
            toggle()
          }}
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
