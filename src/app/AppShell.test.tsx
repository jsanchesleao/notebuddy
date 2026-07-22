import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db } from '../db/db'
import { createFolder } from '../domain/folders/folderRepository'
import { createNotebook } from '../domain/notebooks/notebookRepository'
import { createNote } from '../domain/notes/noteRepository'
import { ThemeProvider } from '../theme/ThemeProvider'
import { AppShell } from './AppShell'

function renderAppShell(initialEntries: string[]) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={initialEntries}>
        <AppShell />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

function stubMatchMedia(matches: boolean) {
  const original = window.matchMedia
  window.matchMedia = ((query: string) =>
    ({
      matches,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia
  return () => {
    window.matchMedia = original
  }
}

beforeEach(async () => {
  window.localStorage.clear()
  await db.folders.clear()
  await db.notebooks.clear()
  await db.notes.clear()
  await db.yjsUpdates.clear()
})

afterEach(() => {
  cleanup()
})

describe('AppShell FAB visibility', () => {
  it('shows the FAB on the home page', async () => {
    renderAppShell(['/'])

    expect(await screen.findByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('shows the FAB on a folder page', async () => {
    const folder = await createFolder({ parentFolderId: null, title: 'Recipes' })

    renderAppShell([`/folders/${folder.id}`])

    expect(await screen.findByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('shows the FAB on a notebook page', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })

    renderAppShell([`/notebooks/${notebook.id}`])

    expect(await screen.findByRole('button', { name: 'Create' })).toBeInTheDocument()
  })

  it('hides the FAB on a note page', async () => {
    const notebook = await createNotebook({ folderId: null, title: 'Journal' })
    const note = await createNote({ notebookId: notebook.id, title: 'Entry' })

    renderAppShell([`/notes/${note.id}`])

    await screen.findByRole('heading', { name: 'Entry' })
    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
  })

  it('hides the FAB on the 404 page', async () => {
    renderAppShell(['/nonexistent'])

    expect(screen.queryByRole('button', { name: 'Create' })).not.toBeInTheDocument()
  })
})

describe('AppShell sidebar toggle persistence', () => {
  it('defaults open on desktop and persists closing it to the desktop key only', async () => {
    const restore = stubMatchMedia(true)
    const user = userEvent.setup()

    renderAppShell(['/'])

    const toggle = screen.getByRole('button', { name: 'Toggle navigation' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(window.localStorage.getItem('notebuddy:sidebar-open-desktop')).toBe('closed')
    expect(window.localStorage.getItem('notebuddy:sidebar-open-mobile')).toBeNull()

    restore()
  })

  it('defaults closed on mobile and persists opening it to the mobile key only', async () => {
    const restore = stubMatchMedia(false)
    const user = userEvent.setup()

    renderAppShell(['/'])

    const toggle = screen.getByRole('button', { name: 'Toggle navigation' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle)

    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(window.localStorage.getItem('notebuddy:sidebar-open-mobile')).toBe('open')
    expect(window.localStorage.getItem('notebuddy:sidebar-open-desktop')).toBeNull()

    restore()
  })
})
