import styles from './valueEditors.module.css'

interface NumberValueEditorProps {
  value: number | null
  onChange: (value: number | null) => void
  disabled?: boolean
}

export function NumberValueEditor({ value, onChange, disabled }: NumberValueEditorProps) {
  return (
    <input
      type="number"
      className={styles.textInput}
      value={value ?? ''}
      onChange={(event) => {
        const raw = event.target.value
        onChange(raw === '' ? null : Number(raw))
      }}
      disabled={disabled}
    />
  )
}
