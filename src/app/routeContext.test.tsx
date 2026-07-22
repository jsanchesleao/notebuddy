import { describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { useCurrentRouteContext } from './routeContext'

function renderAt(path: string) {
  return renderHook(() => useCurrentRouteContext(), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>,
  })
}

describe('useCurrentRouteContext', () => {
  it('reports home for /', () => {
    const { result } = renderAt('/')
    expect(result.current).toEqual({
      routeKind: 'home',
      folderId: null,
      notebookId: null,
      noteId: null,
    })
  })

  it('reports folder for /folders/:folderId', () => {
    const { result } = renderAt('/folders/folder-1')
    expect(result.current).toEqual({
      routeKind: 'folder',
      folderId: 'folder-1',
      notebookId: null,
      noteId: null,
    })
  })

  it('reports notebook for /notebooks/:notebookId', () => {
    const { result } = renderAt('/notebooks/notebook-1')
    expect(result.current).toEqual({
      routeKind: 'notebook',
      folderId: null,
      notebookId: 'notebook-1',
      noteId: null,
    })
  })

  it('reports note for /notes/:noteId', () => {
    const { result } = renderAt('/notes/note-1')
    expect(result.current).toEqual({
      routeKind: 'note',
      folderId: null,
      notebookId: null,
      noteId: 'note-1',
    })
  })

  it('reports notFound for an unmatched route', () => {
    const { result } = renderAt('/nonexistent')
    expect(result.current).toEqual({
      routeKind: 'notFound',
      folderId: null,
      notebookId: null,
      noteId: null,
    })
  })
})
