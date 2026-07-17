import { matchPath, useLocation } from 'react-router-dom'

export interface CurrentRouteContext {
  folderId: string | null
  notebookId: string | null
}

// Sidebar and Fab are siblings of <AppRoutes> in AppShell, not inside the matched
// route's element tree, so useParams() isn't available to them — this derives the
// same info from the current pathname instead.
export function useCurrentRouteContext(): CurrentRouteContext {
  const location = useLocation()

  const folderMatch = matchPath('/folders/:folderId', location.pathname)
  const notebookMatch = matchPath('/notebooks/:notebookId', location.pathname)

  return {
    folderId: folderMatch?.params.folderId ?? null,
    notebookId: notebookMatch?.params.notebookId ?? null,
  }
}
