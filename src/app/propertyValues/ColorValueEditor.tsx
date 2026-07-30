import { useState } from 'react'
import { DismissableDropdown } from '../../components/Menu/DismissableDropdown'
import dropdownStyles from '../../components/Menu/DismissableDropdown.module.css'
import valueEditorStyles from './valueEditors.module.css'
import styles from './ColorValueEditor.module.css'

const COLOR_SWATCHES = [
  '#c0392b',
  '#c0722a',
  '#b8901f',
  '#4c7a52',
  '#2f6f9e',
  '#7a4fa0',
  '#6b6255',
  '#2b2620',
]
const HEX_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

interface ColorValueEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function ColorValueEditor({ value, onChange, disabled }: ColorValueEditorProps) {
  const [draft, setDraft] = useState(value)

  return (
    <DismissableDropdown
      trigger={({ toggle, open }) => (
        <button
          type="button"
          className={dropdownStyles.trigger}
          aria-expanded={open}
          onClick={() => {
            setDraft(value)
            toggle()
          }}
          disabled={disabled}
        >
          <span className={styles.swatchPreview} style={{ background: value || 'transparent' }} />
          {value || 'Not set'}
        </button>
      )}
    >
      {({ close }) => (
        <div className={styles.picker}>
          <div className={styles.swatchGrid}>
            {COLOR_SWATCHES.map((swatch) => (
              <button
                key={swatch}
                type="button"
                className={styles.swatch}
                style={{ background: swatch }}
                aria-label={swatch}
                aria-pressed={swatch === value}
                onClick={() => {
                  onChange(swatch)
                  close()
                }}
              />
            ))}
          </div>
          <form
            className={styles.hexForm}
            onSubmit={(event) => {
              event.preventDefault()
              if (HEX_REGEX.test(draft)) {
                onChange(draft)
                close()
              }
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
