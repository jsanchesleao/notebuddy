import { useState } from 'react'
import { DismissableDropdown } from '../../../components/Menu/DismissableDropdown'
import valueEditorStyles from '../../propertyValues/valueEditors.module.css'
import { PILL_PALETTE } from '../../../domain/tags/tagPalette'
import { setTagColor } from '../../../domain/tags/tagRepository'
import styles from './TagColorPicker.module.css'

const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
const FALLBACK_COLOR = PILL_PALETTE[0]

interface TagColorPickerProps {
  tagName: string
  color?: string
}

// Clicking a note tag pill opens this picker to change its color — the color is stored
// globally per tag name (tagRepository), so the change applies everywhere the tag appears.
export function TagColorPicker({ tagName, color }: TagColorPickerProps) {
  const currentColor = color ?? FALLBACK_COLOR
  const [draft, setDraft] = useState(currentColor)

  return (
    <DismissableDropdown
      trigger={({ toggle, open }) => (
        <button
          type="button"
          className={styles.label}
          aria-expanded={open}
          aria-label={`Change color for tag ${tagName}`}
          onClick={() => {
            setDraft(currentColor)
            toggle()
          }}
        >
          {tagName}
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
                aria-pressed={swatch === currentColor}
                onClick={async () => {
                  await setTagColor(tagName, swatch)
                  close()
                }}
              />
            ))}
          </div>
          <form
            className={styles.hexForm}
            onSubmit={async (event) => {
              event.preventDefault()
              if (!HEX_REGEX.test(draft)) return
              await setTagColor(tagName, draft)
              close()
            }}
          >
            <input
              type="text"
              className={valueEditorStyles.textInput}
              value={draft}
              placeholder="#rrggbb"
              onChange={(event) => setDraft(event.target.value)}
              aria-label="Hex color"
            />
            <button type="submit" disabled={!HEX_REGEX.test(draft)}>
              Set
            </button>
          </form>
        </div>
      )}
    </DismissableDropdown>
  )
}
