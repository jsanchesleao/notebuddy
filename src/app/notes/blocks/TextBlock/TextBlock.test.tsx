import { createRef } from 'react'
import { cleanup, fireEvent, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createEmptyBlock } from '../../../../domain/blocks/noteBlocksFactory'
import { TextBlock, type TextBlockHandle } from './TextBlock'

afterEach(() => {
  cleanup()
})

describe('TextBlock', () => {
  it('renders a contenteditable surface seeded from the block content', () => {
    const block = createEmptyBlock('text')
    const { container } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onSplit={vi.fn()} />,
    )

    const editable = container.querySelector('.ProseMirror')
    expect(editable).toBeTruthy()
    expect(editable).toHaveAttribute('contenteditable', 'true')
  })

  it('debounces onUpdate while typing, flushing the pending save on unmount', async () => {
    const block = createEmptyBlock('text')
    const onUpdate = vi.fn()
    const user = userEvent.setup()

    const { container, unmount } = render(
      <TextBlock block={block} onUpdate={onUpdate} onConvert={vi.fn()} onSplit={vi.fn()} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, 'Hello')

    expect(onUpdate).not.toHaveBeenCalled()

    unmount()

    expect(onUpdate).toHaveBeenCalledTimes(1)
    const [[patch]] = onUpdate.mock.calls
    expect(JSON.stringify(patch.content)).toContain('Hello')
  })

  it('shows a filtered slash-command menu when typing "/" at the start of the block', async () => {
    const block = createEmptyBlock('text')
    const user = userEvent.setup()

    const { container, getByRole, queryByRole } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onSplit={vi.fn()} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, '/tab')

    expect(getByRole('menuitem', { name: 'Table' })).toBeInTheDocument()
    expect(queryByRole('menuitem', { name: 'Text' })).not.toBeInTheDocument()
  })

  it('shows no menu items for a query that matches no block type', async () => {
    const block = createEmptyBlock('text')
    const user = userEvent.setup()

    const { container, queryByRole } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onSplit={vi.fn()} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, '/xyz')

    expect(queryByRole('menu')).not.toBeInTheDocument()
  })

  it('shows the formatting toolbar once the block is focused, even with no text selected', async () => {
    const block = createEmptyBlock('text')
    const user = userEvent.setup()

    const { container, queryByLabelText, getByLabelText } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onSplit={vi.fn()} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    expect(queryByLabelText('Bold')).not.toBeInTheDocument()

    await user.click(editable)

    expect(getByLabelText('Bold')).toBeInTheDocument()
  })

  it('hides the formatting toolbar once the block loses focus', async () => {
    const block = createEmptyBlock('text')
    const user = userEvent.setup()

    const { container, queryByLabelText, getByText } = render(
      <div>
        <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onSplit={vi.fn()} />
        <button type="button">elsewhere</button>
      </div>,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    expect(queryByLabelText('Bold')).toBeInTheDocument()

    // The toolbar's own buttons prevent mousedown default (so clicking them
    // doesn't blur the editor), so clicking must target something outside
    // the toolbar entirely to actually exercise the blur path.
    await user.click(getByText('elsewhere'))
    expect(queryByLabelText('Bold')).not.toBeInTheDocument()
  })

  it('hides the formatting toolbar on Escape, and restores it on a second Escape', async () => {
    const block = createEmptyBlock('text')
    const user = userEvent.setup()

    const { container, queryByLabelText, getByLabelText } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onSplit={vi.fn()} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    expect(getByLabelText('Bold')).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(queryByLabelText('Bold')).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(getByLabelText('Bold')).toBeInTheDocument()
  })

  it('shows the formatting toolbar fresh (not dismissed) after blurring and refocusing', async () => {
    const block = createEmptyBlock('text')
    const user = userEvent.setup()

    const { container, queryByLabelText, getByLabelText, getByText } = render(
      <div>
        <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onSplit={vi.fn()} />
        <button type="button">elsewhere</button>
      </div>,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.keyboard('{Escape}')
    expect(queryByLabelText('Bold')).not.toBeInTheDocument()

    await user.click(getByText('elsewhere'))
    await user.click(editable)
    expect(getByLabelText('Bold')).toBeInTheDocument()
  })

  it('hides the slash-command menu on Escape, and restores the same query on a second Escape', async () => {
    const block = createEmptyBlock('text')
    const user = userEvent.setup()

    const { container, queryByRole, getByRole } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onSplit={vi.fn()} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, '/tab')
    expect(getByRole('menuitem', { name: 'Table' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(queryByRole('menu')).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(getByRole('menuitem', { name: 'Table' })).toBeInTheDocument()
  })

  it('shows the menu for a new query instead of staying dismissed when typing continues after Escape', async () => {
    const block = createEmptyBlock('text')
    const user = userEvent.setup()

    const { container, queryByRole, getByRole } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onSplit={vi.fn()} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, '/tab')
    await user.keyboard('{Escape}')
    expect(queryByRole('menu')).not.toBeInTheDocument()

    await user.type(editable, 'le')
    expect(getByRole('menuitem', { name: 'Table' })).toBeInTheDocument()
  })

  it('applies a text-format slash-command entry to the current block instead of converting it', async () => {
    const block = createEmptyBlock('text')
    const onConvert = vi.fn()
    const user = userEvent.setup()

    const { container, getByRole } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={onConvert} onSplit={vi.fn()} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, '/heading')
    await user.click(getByRole('menuitem', { name: 'Heading 1' }))

    expect(onConvert).not.toHaveBeenCalled()
    expect(container.querySelector('h1')).toBeTruthy()
    expect(editable.textContent).toBe('')
  })

  it('flushes an onUpdate save after applying a text-format slash-command entry', async () => {
    const block = createEmptyBlock('text')
    const onUpdate = vi.fn()
    const user = userEvent.setup()

    const { container, getByRole } = render(
      <TextBlock block={block} onUpdate={onUpdate} onConvert={vi.fn()} onSplit={vi.fn()} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, '/citation')
    await user.click(getByRole('menuitem', { name: 'Citation' }))

    expect(onUpdate).toHaveBeenCalled()
    const [[patch]] = onUpdate.mock.calls
    expect(JSON.stringify(patch.content)).toContain('blockquote')
  })

  it('calls onConvert with the selected type when a slash-command entry is chosen', async () => {
    const block = createEmptyBlock('text')
    const onUpdate = vi.fn()
    const onConvert = vi.fn()
    const user = userEvent.setup()

    const { container, getByRole } = render(
      <TextBlock block={block} onUpdate={onUpdate} onConvert={onConvert} onSplit={vi.fn()} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, '/tab')
    await user.click(getByRole('menuitem', { name: 'Table' }))

    expect(onConvert).toHaveBeenCalledWith('table')
  })

  it('calls onSplit and not onUpdate/onConvert when Enter is pressed', async () => {
    const block = createEmptyBlock('text')
    const onSplit = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onSplit={onSplit} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, 'Hello{Enter}')

    expect(onSplit).toHaveBeenCalledTimes(1)
    expect(editable.textContent).toBe('Hello')
  })

  it('inserts a line break instead of calling onSplit on Shift+Enter', async () => {
    const block = createEmptyBlock('text')
    const onSplit = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onSplit={onSplit} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, 'Hello{Shift>}{Enter}{/Shift}World')

    expect(onSplit).not.toHaveBeenCalled()
    expect(editable.querySelector('br')).toBeTruthy()
  })

  it('does not call onSplit when Enter selects a slash-command entry', async () => {
    const block = createEmptyBlock('text')
    const onConvert = vi.fn()
    const onSplit = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={onConvert} onSplit={onSplit} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    await user.click(editable)
    await user.type(editable, '/tab{Enter}')

    expect(onConvert).toHaveBeenCalledWith('table')
    expect(onSplit).not.toHaveBeenCalled()
  })

  it('fires onEscape("start") on ArrowUp/ArrowLeft in an empty block, without moving native focus', async () => {
    for (const key of ['{ArrowUp}', '{ArrowLeft}']) {
      const block = createEmptyBlock('text')
      const onEscape = vi.fn()
      const user = userEvent.setup()

      const { container, unmount } = render(
        <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onEscape={onEscape} />,
      )
      const editable = container.querySelector('.ProseMirror') as HTMLElement
      await user.click(editable)
      await user.keyboard(key)

      expect(onEscape).toHaveBeenCalledWith('start', false)
      unmount()
    }
  })

  it('fires onEscape("end") on ArrowDown/ArrowRight in an empty block', async () => {
    for (const key of ['{ArrowDown}', '{ArrowRight}']) {
      const block = createEmptyBlock('text')
      const onEscape = vi.fn()
      const user = userEvent.setup()

      const { container, unmount } = render(
        <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onEscape={onEscape} />,
      )
      const editable = container.querySelector('.ProseMirror') as HTMLElement
      await user.click(editable)
      await user.keyboard(key)

      expect(onEscape).toHaveBeenCalledWith('end', false)
      unmount()
    }
  })

  it('passes shiftKey through to onEscape as extendSelection', async () => {
    const block = createEmptyBlock('text')
    const onEscape = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onEscape={onEscape} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement
    await user.click(editable)
    await user.keyboard('{Shift>}{ArrowUp}{/Shift}')

    expect(onEscape).toHaveBeenCalledWith('start', true)
  })

  it('does not fire onEscape at the end when there is still text before the cursor', async () => {
    // A freshly-typed block leaves the cursor after the last character —
    // "at the end", not "in the middle" — but this still exercises the same
    // `parentOffset !== atStart` check that guards mid-text presses, since
    // jsdom's contenteditable has no real caret-navigation to reposition an
    // already-typed cursor without going through user.type() again.
    const block = createEmptyBlock('text')
    const onEscape = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} onEscape={onEscape} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement
    await user.click(editable)
    await user.type(editable, 'Hi{ArrowLeft}')

    expect(onEscape).not.toHaveBeenCalled()
  })

  it('fires onBackspaceAtStart with isEmpty=true for an empty block', async () => {
    const block = createEmptyBlock('text')
    const onBackspaceAtStart = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <TextBlock
        block={block}
        onUpdate={vi.fn()}
        onConvert={vi.fn()}
        onBackspaceAtStart={onBackspaceAtStart}
      />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement
    await user.click(editable)
    await user.type(editable, '{Backspace}')

    expect(onBackspaceAtStart).toHaveBeenCalledTimes(1)
    const [[isEmpty]] = onBackspaceAtStart.mock.calls
    expect(isEmpty).toBe(true)
  })

  it('fires onBackspaceAtStart with isEmpty=false and the live content when backspacing at the start of pre-existing text', async () => {
    const block = {
      ...createEmptyBlock('text'),
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }],
      },
    }
    const onBackspaceAtStart = vi.fn()
    const ref = createRef<TextBlockHandle>()

    const { container } = render(
      <TextBlock
        block={block}
        onUpdate={vi.fn()}
        onConvert={vi.fn()}
        onBackspaceAtStart={onBackspaceAtStart}
        ref={ref}
      />,
    )
    // jsdom has no real caret-from-click resolution, so use the imperative
    // handle (pure ProseMirror position math) to deterministically place the
    // cursor at the true start rather than relying on a click. Dispatching
    // the keydown directly at the editable node (rather than going through
    // userEvent's own focus-tracking, which doesn't see this native
    // `.focus()` call) is what makes ProseMirror's handler see it.
    ref.current?.focusStart()
    const editable = container.querySelector('.ProseMirror') as HTMLElement
    fireEvent.keyDown(editable, { key: 'Backspace' })

    expect(onBackspaceAtStart).toHaveBeenCalledTimes(1)
    const [[isEmpty, content]] = onBackspaceAtStart.mock.calls
    expect(isEmpty).toBe(false)
    expect(JSON.stringify(content)).toContain('Hi')
  })

  it('does not fire onBackspaceAtStart when backspacing at the end of typed text', async () => {
    const block = createEmptyBlock('text')
    const onBackspaceAtStart = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <TextBlock
        block={block}
        onUpdate={vi.fn()}
        onConvert={vi.fn()}
        onBackspaceAtStart={onBackspaceAtStart}
      />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement
    await user.click(editable)
    await user.type(editable, 'Hi{Backspace}')

    expect(onBackspaceAtStart).not.toHaveBeenCalled()
  })

  it('fires onDeleteAtEnd when Delete is pressed at the end of the block', async () => {
    const block = createEmptyBlock('text')
    const onDeleteAtEnd = vi.fn()
    const user = userEvent.setup()

    const { container } = render(
      <TextBlock
        block={block}
        onUpdate={vi.fn()}
        onConvert={vi.fn()}
        onDeleteAtEnd={onDeleteAtEnd}
      />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement
    await user.click(editable)
    await user.type(editable, 'Hi{Delete}')

    expect(onDeleteAtEnd).toHaveBeenCalledTimes(1)
    expect(editable.textContent).toBe('Hi')
  })

  it('does not fire onDeleteAtEnd when there is more text ahead of the cursor', async () => {
    const block = {
      ...createEmptyBlock('text'),
      content: {
        type: 'doc',
        content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hi' }] }],
      },
    }
    const onDeleteAtEnd = vi.fn()
    const ref = createRef<TextBlockHandle>()

    const { container } = render(
      <TextBlock
        block={block}
        onUpdate={vi.fn()}
        onConvert={vi.fn()}
        onDeleteAtEnd={onDeleteAtEnd}
        ref={ref}
      />,
    )
    ref.current?.focusStart()
    const editable = container.querySelector('.ProseMirror') as HTMLElement
    fireEvent.keyDown(editable, { key: 'Delete' })

    expect(onDeleteAtEnd).not.toHaveBeenCalled()
  })

  it('exposes focusStart/focusEnd/getContent/appendContent via the imperative handle', async () => {
    const block = createEmptyBlock('text')
    const onUpdate = vi.fn()
    const ref = createRef<TextBlockHandle>()
    const user = userEvent.setup()

    const { container } = render(
      <TextBlock block={block} onUpdate={onUpdate} onConvert={vi.fn()} ref={ref} />,
    )
    const editable = container.querySelector('.ProseMirror') as HTMLElement
    await user.click(editable)
    await user.type(editable, 'Hello ')

    expect(JSON.stringify(ref.current?.getContent())).toContain('Hello')

    ref.current?.appendContent({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'World' }] }],
    })

    expect(editable.textContent).toBe('Hello World')
    expect(onUpdate).toHaveBeenCalled()
    const lastPatch = onUpdate.mock.calls[onUpdate.mock.calls.length - 1][0]
    expect(JSON.stringify(lastPatch.content)).toContain('Hello World')
  })
})

describe('TextBlock list handling', () => {
  it('adds a new sibling list item (not onSplit) on Enter in a non-empty list item', async () => {
    const block = {
      ...createEmptyBlock('text'),
      content: {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello' }] }],
              },
            ],
          },
        ],
      },
    }
    const onSplit = vi.fn()
    const ref = createRef<TextBlockHandle>()

    const { container } = render(
      <TextBlock
        block={block}
        onUpdate={vi.fn()}
        onConvert={vi.fn()}
        onSplit={onSplit}
        ref={ref}
      />,
    )
    ref.current?.focusEnd()
    const editable = container.querySelector('.ProseMirror') as HTMLElement
    fireEvent.keyDown(editable, { key: 'Enter' })

    expect(onSplit).not.toHaveBeenCalled()
    expect(editable.querySelectorAll('li')).toHaveLength(2)
  })

  it('calls onSplit (ends the block) on Enter in an empty, non-nested list item', async () => {
    const block = {
      ...createEmptyBlock('text'),
      content: {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
          },
        ],
      },
    }
    const onSplit = vi.fn()
    const ref = createRef<TextBlockHandle>()

    const { container } = render(
      <TextBlock
        block={block}
        onUpdate={vi.fn()}
        onConvert={vi.fn()}
        onSplit={onSplit}
        ref={ref}
      />,
    )
    ref.current?.focusEnd()
    const editable = container.querySelector('.ProseMirror') as HTMLElement
    fireEvent.keyDown(editable, { key: 'Enter' })

    expect(onSplit).toHaveBeenCalledTimes(1)
    expect(editable.querySelectorAll('li')).toHaveLength(0)
    expect(editable.querySelector('p')).toBeTruthy()
  })

  it('lifts an empty nested list item one level (not onSplit) on Enter', async () => {
    const block = {
      ...createEmptyBlock('text'),
      content: {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  { type: 'paragraph', content: [{ type: 'text', text: 'Parent' }] },
                  {
                    type: 'bulletList',
                    content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
                  },
                ],
              },
            ],
          },
        ],
      },
    }
    const onSplit = vi.fn()
    const ref = createRef<TextBlockHandle>()

    const { container } = render(
      <TextBlock
        block={block}
        onUpdate={vi.fn()}
        onConvert={vi.fn()}
        onSplit={onSplit}
        ref={ref}
      />,
    )
    ref.current?.focusEnd()
    const editable = container.querySelector('.ProseMirror') as HTMLElement
    fireEvent.keyDown(editable, { key: 'Enter' })

    expect(onSplit).not.toHaveBeenCalled()
    const outerList = editable.querySelector('ul') as HTMLElement
    expect(outerList.querySelectorAll(':scope > li')).toHaveLength(2)
    expect(outerList.querySelector('ul')).toBeNull()
  })

  it('sinks a list item on Tab and lifts it back on Shift+Tab', async () => {
    const block = {
      ...createEmptyBlock('text'),
      content: {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'One' }] }],
              },
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Two' }] }],
              },
            ],
          },
        ],
      },
    }
    const ref = createRef<TextBlockHandle>()

    const { container } = render(
      <TextBlock block={block} onUpdate={vi.fn()} onConvert={vi.fn()} ref={ref} />,
    )
    ref.current?.focusEnd()
    const editable = container.querySelector('.ProseMirror') as HTMLElement

    fireEvent.keyDown(editable, { key: 'Tab' })
    const outerList = editable.querySelector('ul') as HTMLElement
    expect(outerList.querySelectorAll(':scope > li')).toHaveLength(1)
    expect(outerList.querySelector('ul')).toBeTruthy()

    fireEvent.keyDown(editable, { key: 'Tab', shiftKey: true })
    expect(outerList.querySelectorAll(':scope > li')).toHaveLength(2)
    expect(outerList.querySelector('ul')).toBeNull()
  })

  it('outdents an empty nested list item on Backspace without firing onBackspaceAtStart', async () => {
    const block = {
      ...createEmptyBlock('text'),
      content: {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [
                  { type: 'paragraph', content: [{ type: 'text', text: 'Parent' }] },
                  {
                    type: 'bulletList',
                    content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
                  },
                ],
              },
            ],
          },
        ],
      },
    }
    const onBackspaceAtStart = vi.fn()
    const ref = createRef<TextBlockHandle>()

    const { container } = render(
      <TextBlock
        block={block}
        onUpdate={vi.fn()}
        onConvert={vi.fn()}
        onBackspaceAtStart={onBackspaceAtStart}
        ref={ref}
      />,
    )
    ref.current?.focusEnd()
    const editable = container.querySelector('.ProseMirror') as HTMLElement
    fireEvent.keyDown(editable, { key: 'Backspace' })

    expect(onBackspaceAtStart).not.toHaveBeenCalled()
    const outerList = editable.querySelector('ul') as HTMLElement
    expect(outerList.querySelectorAll(':scope > li')).toHaveLength(2)
    expect(outerList.querySelector('ul')).toBeNull()
  })

  it('dissolves a single empty top-level list item to a paragraph on Backspace, then merges on the next Backspace', async () => {
    const block = {
      ...createEmptyBlock('text'),
      content: {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
          },
        ],
      },
    }
    const onBackspaceAtStart = vi.fn()
    const ref = createRef<TextBlockHandle>()

    const { container } = render(
      <TextBlock
        block={block}
        onUpdate={vi.fn()}
        onConvert={vi.fn()}
        onBackspaceAtStart={onBackspaceAtStart}
        ref={ref}
      />,
    )
    ref.current?.focusEnd()
    const editable = container.querySelector('.ProseMirror') as HTMLElement
    fireEvent.keyDown(editable, { key: 'Backspace' })

    expect(onBackspaceAtStart).not.toHaveBeenCalled()
    expect(editable.querySelector('ul')).toBeNull()

    fireEvent.keyDown(editable, { key: 'Backspace' })

    expect(onBackspaceAtStart).toHaveBeenCalledTimes(1)
    const [[isEmpty]] = onBackspaceAtStart.mock.calls
    expect(isEmpty).toBe(true)
  })

  it('does not fire onEscape moving ArrowDown from the first item into a second item', async () => {
    const block = {
      ...createEmptyBlock('text'),
      content: {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              { type: 'listItem', content: [{ type: 'paragraph' }] },
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Second' }] }],
              },
            ],
          },
        ],
      },
    }
    const onEscape = vi.fn()
    const ref = createRef<TextBlockHandle>()

    const { container } = render(
      <TextBlock
        block={block}
        onUpdate={vi.fn()}
        onConvert={vi.fn()}
        onEscape={onEscape}
        ref={ref}
      />,
    )
    ref.current?.focusStart()
    const editable = container.querySelector('.ProseMirror') as HTMLElement
    fireEvent.keyDown(editable, { key: 'ArrowDown' })

    expect(onEscape).not.toHaveBeenCalled()
  })

  it('does not fire onEscape moving ArrowUp from the last item into a prior item', async () => {
    const block = {
      ...createEmptyBlock('text'),
      content: {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }],
              },
              { type: 'listItem', content: [{ type: 'paragraph' }] },
            ],
          },
        ],
      },
    }
    const onEscape = vi.fn()
    const ref = createRef<TextBlockHandle>()

    const { container } = render(
      <TextBlock
        block={block}
        onUpdate={vi.fn()}
        onConvert={vi.fn()}
        onEscape={onEscape}
        ref={ref}
      />,
    )
    ref.current?.focusEnd()
    const editable = container.querySelector('.ProseMirror') as HTMLElement
    fireEvent.keyDown(editable, { key: 'ArrowUp' })

    expect(onEscape).not.toHaveBeenCalled()
  })

  it('fires onEscape("end") on ArrowDown from the last item of a multi-item list', async () => {
    const block = {
      ...createEmptyBlock('text'),
      content: {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [
              {
                type: 'listItem',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: 'First' }] }],
              },
              { type: 'listItem', content: [{ type: 'paragraph' }] },
            ],
          },
        ],
      },
    }
    const onEscape = vi.fn()
    const ref = createRef<TextBlockHandle>()

    const { container } = render(
      <TextBlock
        block={block}
        onUpdate={vi.fn()}
        onConvert={vi.fn()}
        onEscape={onEscape}
        ref={ref}
      />,
    )
    ref.current?.focusEnd()
    const editable = container.querySelector('.ProseMirror') as HTMLElement
    fireEvent.keyDown(editable, { key: 'ArrowDown' })

    expect(onEscape).toHaveBeenCalledWith('end', false)
  })

  it('fires onEscape("start") on ArrowUp from the first (and only) item of a list', async () => {
    const block = {
      ...createEmptyBlock('text'),
      content: {
        type: 'doc',
        content: [
          {
            type: 'bulletList',
            content: [{ type: 'listItem', content: [{ type: 'paragraph' }] }],
          },
        ],
      },
    }
    const onEscape = vi.fn()
    const ref = createRef<TextBlockHandle>()

    const { container } = render(
      <TextBlock
        block={block}
        onUpdate={vi.fn()}
        onConvert={vi.fn()}
        onEscape={onEscape}
        ref={ref}
      />,
    )
    ref.current?.focusStart()
    const editable = container.querySelector('.ProseMirror') as HTMLElement
    fireEvent.keyDown(editable, { key: 'ArrowUp' })

    expect(onEscape).toHaveBeenCalledWith('start', false)
  })
})
