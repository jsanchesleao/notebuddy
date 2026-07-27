import styles from './valueEditors.module.css'

interface LinkValueEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function LinkValueEditor({ value, onChange, disabled }: LinkValueEditorProps) {
  return (
    <input
      type="url"
      className={styles.textInput}
      placeholder="https://example.com"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    />
  )
}
