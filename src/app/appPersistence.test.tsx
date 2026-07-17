import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { db, NotebuddyDB } from '../db/db'
import { ThemeProvider } from '../theme/ThemeProvider'
import { AppShell } from './AppShell'

beforeEach(async () => {
  await db.folders.clear()
  await db.notebooks.clear()
  await db.notes.clear()
  await db.yjsUpdates.clear()
})

afterEach(() => {
  cleanup()
})

function renderApp() {
  return render(
    <ThemeProvider>
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>
    </ThemeProvider>,
  )
}

describe('offline persistence acceptance', () => {
  it('creating a folder, notebook, and note through the UI survives a simulated reload with no network', async () => {
    const user = userEvent.setup()
    const { unmount } = renderApp()
    let main = within(screen.getByRole('main'))

    await user.click(await screen.findByRole('button', { name: 'Create' }))
    await user.click(screen.getByRole('button', { name: '+ New Folder' }))
    await user.type(screen.getByLabelText('New folder title'), 'Work')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(await main.findByRole('link', { name: 'Work' }))

    await user.click(await screen.findByRole('button', { name: 'Create' }))
    await user.click(screen.getByRole('button', { name: '+ New Notebook' }))
    await user.type(screen.getByLabelText('New notebook title'), 'Journal')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await user.click(await main.findByRole('link', { name: 'Journal' }))

    await user.click(await screen.findByRole('button', { name: 'Create' }))
    await user.click(screen.getByRole('button', { name: '+ New Note' }))
    await user.type(screen.getByLabelText('New note title'), 'First entry')
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await main.findByRole('link', { name: 'First entry' })

    unmount()

    // Stand in for "reload the page": open a fresh Dexie connection against the same
    // underlying (fake-indexeddb) database, independent of the app's own singleton `db`,
    // to prove the data is durably persisted rather than only held in JS memory.
    const reopened = new NotebuddyDB(db.name)
    expect(await reopened.folders.toArray()).toHaveLength(1)
    expect(await reopened.notebooks.toArray()).toHaveLength(1)
    expect(await reopened.notes.toArray()).toHaveLength(1)
    reopened.close()

    renderApp()
    main = within(screen.getByRole('main'))

    await user.click(await main.findByRole('link', { name: 'Work' }))
    await user.click(await main.findByRole('link', { name: 'Journal' }))
    expect(await main.findByRole('link', { name: 'First entry' })).toBeInTheDocument()
  })
})
