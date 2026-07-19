import { act, cleanup, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { EditorContent, useEditor, type Editor } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { BlockTypeSelect } from './BlockTypeSelect'

afterEach(() => {
  cleanup()
})

function Harness({ onReady }: { onReady: (editor: Editor) => void }) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: '<p>Hello world</p>',
  })

  if (editor) onReady(editor)

  return (
    <div>
      {editor && <BlockTypeSelect editor={editor} />}
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
    editor!.commands.setTextSelection(1)
  })
  return { ...utils, editor: editor! }
}

describe('BlockTypeSelect', () => {
  it('shows "Paragraph" as the default trigger label', async () => {
    const { getByLabelText } = await setup()

    expect(getByLabelText('Block type')).toHaveTextContent('Paragraph')
  })

  it('opens a menu listing all block type options', async () => {
    const { getByLabelText, getByRole } = await setup()
    const user = userEvent.setup()

    await user.click(getByLabelText('Block type'))

    expect(getByRole('menu')).toBeInTheDocument()
    for (const label of [
      'Paragraph',
      'Heading 1',
      'Heading 2',
      'Heading 3',
      'Heading 4',
      'Citation',
      'Bulleted List',
      'Numbered List',
    ]) {
      expect(getByRole('menuitemradio', { name: label })).toBeInTheDocument()
    }
  })

  it('converts the current block to a heading and updates the trigger label', async () => {
    const { editor, getByLabelText, getByRole, queryByRole } = await setup()
    const user = userEvent.setup()

    await user.click(getByLabelText('Block type'))
    await user.click(getByRole('menuitemradio', { name: 'Heading 2' }))

    expect(editor.isActive('heading', { level: 2 })).toBe(true)
    expect(editor.getHTML()).toContain('<h2>')
    expect(queryByRole('menu')).not.toBeInTheDocument()
    expect(getByLabelText('Block type')).toHaveTextContent('Heading 2')
  })

  it('converts the current block to a citation (blockquote) and updates the trigger label', async () => {
    const { editor, getByLabelText, getByRole } = await setup()
    const user = userEvent.setup()

    await user.click(getByLabelText('Block type'))
    await user.click(getByRole('menuitemradio', { name: 'Citation' }))

    expect(editor.isActive('blockquote')).toBe(true)
    expect(editor.getHTML()).toContain('<blockquote>')
    // A citation wraps a plain paragraph, which is itself also
    // `isActive('paragraph')` — the trigger must still report the more
    // specific "Citation" rather than being shadowed by that match.
    expect(getByLabelText('Block type')).toHaveTextContent('Citation')
  })

  it('converts the current block to a bulleted list and updates the trigger label', async () => {
    const { editor, getByLabelText, getByRole } = await setup()
    const user = userEvent.setup()

    await user.click(getByLabelText('Block type'))
    await user.click(getByRole('menuitemradio', { name: 'Bulleted List' }))

    expect(editor.isActive('bulletList')).toBe(true)
    expect(editor.getHTML()).toContain('<ul>')
    expect(getByLabelText('Block type')).toHaveTextContent('Bulleted List')
  })

  it('converts the current block to a numbered list and updates the trigger label', async () => {
    const { editor, getByLabelText, getByRole } = await setup()
    const user = userEvent.setup()

    await user.click(getByLabelText('Block type'))
    await user.click(getByRole('menuitemradio', { name: 'Numbered List' }))

    expect(editor.isActive('orderedList')).toBe(true)
    expect(editor.getHTML()).toContain('<ol>')
    expect(getByLabelText('Block type')).toHaveTextContent('Numbered List')
  })

  it('converts a heading back to a paragraph', async () => {
    const { editor, getByLabelText, getByRole } = await setup()
    const user = userEvent.setup()

    await user.click(getByLabelText('Block type'))
    await user.click(getByRole('menuitemradio', { name: 'Heading 1' }))
    expect(editor.isActive('heading', { level: 1 })).toBe(true)

    await user.click(getByLabelText('Block type'))
    await user.click(getByRole('menuitemradio', { name: 'Paragraph' }))

    expect(editor.isActive('paragraph')).toBe(true)
    expect(editor.getHTML()).not.toContain('<h1>')
  })
})
