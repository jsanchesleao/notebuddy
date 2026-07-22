import { matchPath, useLocation } from 'react-router-dom'

export type RouteKind = 'home' | 'folder' | 'notebook' | 'note' | 'notFound'

export interface CurrentRouteContext {
  routeKind: RouteKind
  folderId: string | null
  notebookId: string | null
  noteId: string | null
}

// Sidebar and Fab are siblings of <AppRoutes> in AppShell, not inside the matched
// route's element tree, so useParams() isn't available to them — this derives the
// same info from the current pathname instead.
export function useCurrentRouteContext(): CurrentRouteContext {
  const location = useLocation()

  const homeMatch = matchPath('/', location.pathname)
  const folderMatch = matchPath('/folders/:folderId', location.pathname)
  const notebookMatch = matchPath('/notebooks/:notebookId', location.pathname)
  const noteMatch = matchPath('/notes/:noteId', location.pathname)

  const routeKind: RouteKind = homeMatch
    ? 'home'
    : folderMatch
      ? 'folder'
      : notebookMatch
        ? 'notebook'
        : noteMatch
          ? 'note'
          : 'notFound'

  return {
    routeKind,
    folderId: folderMatch?.params.folderId ?? null,
    notebookId: notebookMatch?.params.notebookId ?? null,
    noteId: noteMatch?.params.noteId ?? null,
  }
}
