import { act, cleanup, render, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { TextAlign } from '@tiptap/extension-text-align'
import { TextFormattingToolbar } from './TextFormattingToolbar'

afterEach(() => {
  cleanup()
})

// `TextFormattingToolbar` is normally rendered inside `TextBlock`'s own
// pinned-toolbar wrapper; these tests exercise it directly against a real
// editor instance instead, so its buttons can be asserted on in isolation.
function Harness({ onReady }: { onReady: (editor: Editor) => void }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: '<p>Hello world</p>',
  })

  if (editor) onReady(editor)

  return (
    <div>
      {editor && <TextFormattingToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}

async function setup() {
  let editor: Editor | undefined
  const utils = render(<Harness onReady={(e) => (editor = e)} />)
  while (!editor) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
  act(() => {
    editor!.commands.selectAll()
  })
  return { ...utils, editor: editor! }
}

describe('TextFormattingToolbar', () => {
  it('toggles bold on the current selection', async () => {
    const { editor, getByLabelText } = await setup()
    const user = userEvent.setup()

    await user.click(getByLabelText('Bold'))

    expect(editor.isActive('bold')).toBe(true)
    expect(editor.getHTML()).toContain('<strong>')
  })

  it('toggles italic on the current selection', async () => {
    const { editor, getByLabelText } = await setup()
    const user = userEvent.setup()

    await user.click(getByLabelText('Italic'))

    expect(editor.isActive('italic')).toBe(true)
    expect(editor.getHTML()).toContain('<em>')
  })

  it('toggles underline on the current selection', async () => {
    const { editor, getByLabelText } = await setup()
    const user = userEvent.setup()

    await user.click(getByLabelText('Underline'))

    expect(editor.isActive('underline')).toBe(true)
    expect(editor.getHTML()).toContain('<u>')
  })

  it('applies a preset color and then removes it', async () => {
    const { editor, getByLabelText } = await setup()
    const user = userEvent.setup()

    await user.click(getByLabelText('Red'))
    expect(editor.getHTML()).toContain('color: rgb(192, 57, 43)')

    await user.click(getByLabelText('Remove color'))
    expect(editor.getHTML()).not.toContain('color: rgb(192, 57, 43)')
  })

  it('sets text alignment on the current block', async () => {
    const { editor, getByLabelText } = await setup()
    const user = userEvent.setup()

    await user.click(getByLabelText('Align center'))

    expect(editor.isActive({ textAlign: 'center' })).toBe(true)
    expect(editor.getHTML()).toContain('text-align: center')
  })

  it('reflects the active alignment via aria-pressed', async () => {
    const { editor, getByLabelText } = await setup()
    const user = userEvent.setup()

    await user.click(getByLabelText('Align right'))

    await waitFor(() => {
      expect(getByLabelText('Align right')).toHaveAttribute('aria-pressed', 'true')
    })
    expect(getByLabelText('Align left')).toHaveAttribute('aria-pressed', 'false')
    expect(editor.isActive({ textAlign: 'right' })).toBe(true)
  })
})
