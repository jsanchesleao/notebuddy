import Prism from 'prismjs'
// Dependency order matters: these are plain IIFEs that mutate the shared
// `Prism.languages` object, so a language must be imported before anything
// that extends it (clike -> javascript -> typescript, markup -> markdown).
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-markdown'

export interface LanguageOption {
  value: string
  label: string
}

export const CODE_LANGUAGES: LanguageOption[] = [
  { value: 'plaintext', label: 'Plain text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'markup', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'python', label: 'Python' },
  { value: 'json', label: 'JSON' },
  { value: 'bash', label: 'Bash' },
  { value: 'sql', label: 'SQL' },
  { value: 'markdown', label: 'Markdown' },
]

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function highlightCode(code: string, language: string): string {
  const grammar = Prism.languages[language]
  if (!grammar) return escapeHtml(code)
  return Prism.highlight(code, grammar, language)
}
