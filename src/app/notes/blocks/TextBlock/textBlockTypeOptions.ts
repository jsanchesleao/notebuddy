import type { Editor } from '@tiptap/core'
import type { IconName } from '../../../../components/Icon/Icon'

export interface TextBlockTypeOption {
  key: string
  label: string
  icon: IconName
  isActive: (editor: Editor) => boolean
  apply: (editor: Editor) => void
}

export const TEXT_BLOCK_TYPE_OPTIONS: TextBlockTypeOption[] = [
  {
    key: 'paragraph',
    label: 'Paragraph',
    icon: 'paragraph',
    isActive: (editor) => editor.isActive('paragraph'),
    apply: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    key: 'heading1',
    label: 'Heading 1',
    icon: 'heading1',
    isActive: (editor) => editor.isActive('heading', { level: 1 }),
    apply: (editor) => editor.chain().focus().setNode('heading', { level: 1 }).run(),
  },
  {
    key: 'heading2',
    label: 'Heading 2',
    icon: 'heading2',
    isActive: (editor) => editor.isActive('heading', { level: 2 }),
    apply: (editor) => editor.chain().focus().setNode('heading', { level: 2 }).run(),
  },
  {
    key: 'heading3',
    label: 'Heading 3',
    icon: 'heading3',
    isActive: (editor) => editor.isActive('heading', { level: 3 }),
    apply: (editor) => editor.chain().focus().setNode('heading', { level: 3 }).run(),
  },
  {
    key: 'heading4',
    label: 'Heading 4',
    icon: 'heading4',
    isActive: (editor) => editor.isActive('heading', { level: 4 }),
    apply: (editor) => editor.chain().focus().setNode('heading', { level: 4 }).run(),
  },
  {
    key: 'citation',
    label: 'Citation',
    icon: 'citation',
    isActive: (editor) => editor.isActive('blockquote'),
    apply: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    key: 'bulletList',
    label: 'Bulleted List',
    icon: 'bulletList',
    isActive: (editor) => editor.isActive('bulletList'),
    apply: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    key: 'orderedList',
    label: 'Numbered List',
    icon: 'orderedList',
    isActive: (editor) => editor.isActive('orderedList'),
    apply: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
]

// `paragraph`'s `isActive` matches any bare paragraph, including the one
// nested inside a citation's blockquote or a list item — so it's checked
// last, as a fallback, rather than first: otherwise it would always shadow
// the more specific wrapping type an option earlier in the array represents.
// Returns `undefined` only when truly nothing matches (e.g. a selection
// spanning multiple block types, such as a Ctrl+A that covers a heading and
// StarterKit's auto-inserted trailing paragraph) — callers should treat that
// as "no single type applies" rather than falling back to a specific option,
// which would misleadingly imply the content had actually been converted.
export function getActiveTextBlockTypeOption(editor: Editor): TextBlockTypeOption | undefined {
  return (
    TEXT_BLOCK_TYPE_OPTIONS.find(
      (option) => option.key !== 'paragraph' && option.isActive(editor),
    ) ??
    TEXT_BLOCK_TYPE_OPTIONS.find((option) => option.key === 'paragraph' && option.isActive(editor))
  )
}
