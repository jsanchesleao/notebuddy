import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { db } from '../../db/db'
import { ManageTagsModal } from './ManageTagsModal'
import { scanTagUsage } from '../../domain/tags/tagUsageClient'
import type { TagUsage } from '../../domain/tags/tagUsage'

// Real Web Workers aren't available under jsdom/Vitest, so the worker-backed scan is mocked
// at its client boundary — everything downstream (search, delete, the real deleteTags
// transaction) runs against the real fake-indexeddb-backed db.
vi.mock('../../domain/tags/tagUsageClient', () => ({
  scanTagUsage: vi.fn(),
}))

const scanTagUsageMock = vi.mocked(scanTagUsage)

beforeEach(async () => {
  await db.tags.clear()
  await db.notes.clear()
  scanTagUsageMock.mockReset()
})

afterEach(() => {
  cleanup()
})

describe('ManageTagsModal', () => {
  it('shows a loading state before the scan resolves, then the tag list', async () => {
    let resolveScan: (value: TagUsage[]) => void = () => {}
    scanTagUsageMock.mockReturnValue(
      new Promise((resolve) => {
        resolveScan = resolve
      }),
    )

    render(<ManageTagsModal onClose={() => {}} />)
    expect(screen.getByText('Scanning notes…')).toBeInTheDocument()

    resolveScan([{ name: 'urgent', color: '#457b9d', count: 3 }])

    expect(await screen.findByText('urgent')).toBeInTheDocument()
    expect(screen.getByText('3 notes')).toBeInTheDocument()
    expect(screen.queryByText('Scanning notes…')).not.toBeInTheDocument()
  })

  it('shows an error message when the scan fails, with no fallback list', async () => {
    scanTagUsageMock.mockRejectedValue(new Error('worker unavailable'))

    render(<ManageTagsModal onClose={() => {}} />)

    expect(await screen.findByText('worker unavailable')).toBeInTheDocument()
    expect(screen.queryByText('Scanning notes…')).not.toBeInTheDocument()
  })

  it('shows an empty state when no tags are registered', async () => {
    scanTagUsageMock.mockResolvedValue([])

    render(<ManageTagsModal onClose={() => {}} />)

    expect(await screen.findByText('No tags yet.')).toBeInTheDocument()
  })

  it('filters the list by the search box', async () => {
    scanTagUsageMock.mockResolvedValue([
      { name: 'urgent', color: '#457b9d', count: 1 },
      { name: 'work', color: '#e07a5f', count: 2 },
    ])
    const user = userEvent.setup()

    render(<ManageTagsModal onClose={() => {}} />)
    await screen.findByText('urgent')

    await user.type(screen.getByLabelText('Search tags'), 'urg')

    expect(screen.getByText('urgent')).toBeInTheDocument()
    expect(screen.queryByText('work')).not.toBeInTheDocument()
  })

  it('deletes a single tag via inline confirm, stating its note count, then re-scans', async () => {
    await db.tags.add({ name: 'urgent', color: '#457b9d', createdAt: new Date().toISOString() })
    scanTagUsageMock
      .mockResolvedValueOnce([{ name: 'urgent', color: '#457b9d', count: 2 }])
      .mockResolvedValueOnce([])
    const user = userEvent.setup()

    render(<ManageTagsModal onClose={() => {}} />)
    await user.click(await screen.findByRole('button', { name: 'Delete tag urgent' }))

    expect(
      screen.getByRole('button', { name: 'Confirm delete (used by 2 notes)' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm delete (used by 2 notes)' }))

    await waitFor(async () => expect(await db.tags.get('urgent')).toBeUndefined())
    await screen.findByText('No tags yet.')
    expect(scanTagUsageMock).toHaveBeenCalledTimes(2)
  })

  it('removes only unused tags via the bulk button, disabled when none are unused', async () => {
    await db.tags.bulkAdd([
      { name: 'used', color: '#457b9d', createdAt: new Date().toISOString() },
      { name: 'stale-a', color: '#e07a5f', createdAt: new Date().toISOString() },
      { name: 'stale-b', color: '#f2b134', createdAt: new Date().toISOString() },
    ])
    scanTagUsageMock
      .mockResolvedValueOnce([
        { name: 'used', color: '#457b9d', count: 1 },
        { name: 'stale-a', color: '#e07a5f', count: 0 },
        { name: 'stale-b', color: '#f2b134', count: 0 },
      ])
      .mockResolvedValueOnce([{ name: 'used', color: '#457b9d', count: 1 }])
    const user = userEvent.setup()

    render(<ManageTagsModal onClose={() => {}} />)
    await screen.findByText('used')

    const bulkButton = screen.getByRole('button', { name: 'Remove unused tags (2)' })
    await user.click(bulkButton)
    await user.click(screen.getByRole('button', { name: 'Confirm remove 2 unused tags' }))

    await waitFor(async () => {
      expect(await db.tags.get('stale-a')).toBeUndefined()
      expect(await db.tags.get('stale-b')).toBeUndefined()
    })
    expect(await db.tags.get('used')).toBeDefined()
    await screen.findByRole('button', { name: 'Remove unused tags (0)' })
    expect(screen.getByRole('button', { name: 'Remove unused tags (0)' })).toBeDisabled()
  })
})
