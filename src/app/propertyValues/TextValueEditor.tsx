import styles from './valueEditors.module.css'

interface TextValueEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function TextValueEditor({ value, onChange, disabled }: TextValueEditorProps) {
  return (
    <input
      type="text"
      className={styles.textInput}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    />
  )
}
