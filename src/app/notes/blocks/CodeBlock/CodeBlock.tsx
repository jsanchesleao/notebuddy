import { useEffect, useRef, useState } from 'react'
import { CODE_LANGUAGES, highlightCode } from './prismLanguages'
import type { NoteBlock } from '../../../../domain/blocks/blocks.types'
import styles from './CodeBlock.module.css'

const SAVE_DEBOUNCE_MS = 500

interface CodeBlockProps {
  block: Extract<NoteBlock, { type: 'code' }>
  onUpdate: (patch: { code?: string; language?: string }) => void
}

export function CodeBlock({ block, onUpdate }: CodeBlockProps) {
  const [code, setCode] = useState(block.code)
  const [language, setLanguage] = useState(block.language)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    }
  }, [])

  const handleCodeChange = (value: string) => {
    setCode(value)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    saveTimeoutRef.current = setTimeout(() => onUpdate({ code: value }), SAVE_DEBOUNCE_MS)
  }

  const handleLanguageChange = (value: string) => {
    setLanguage(value)
    onUpdate({ language: value })
  }

  return (
    <div className={styles.codeBlock}>
      <select
        className={styles.languageSelect}
        value={language}
        onChange={(event) => handleLanguageChange(event.target.value)}
        aria-label="Code language"
      >
        {CODE_LANGUAGES.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className={styles.editorWrapper}>
        <pre
          ref={preRef}
          className={styles.highlight}
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: `${highlightCode(code, language)}\n` }}
        />
        <textarea
          className={styles.textarea}
          value={code}
          spellCheck={false}
          onChange={(event) => handleCodeChange(event.target.value)}
          onScroll={(event) => {
            if (preRef.current) {
              preRef.current.scrollTop = event.currentTarget.scrollTop
              preRef.current.scrollLeft = event.currentTarget.scrollLeft
            }
          }}
          aria-label="Code"
        />
      </div>
    </div>
  )
}
