import { useLiveQuery } from 'dexie-react-hooks'
import { SidebarSection } from './SidebarSection'
import { FolderTree } from './FolderTree'
import { getNotebook } from '../../domain/notebooks/notebookRepository'

interface SidebarFolderViewProps {
  currentFolderId: string | null
  activeNotebookId: string | null
}

export function SidebarFolderView({ currentFolderId, activeNotebookId }: SidebarFolderViewProps) {
  const activeNotebook = useLiveQuery(
    () => (activeNotebookId ? getNotebook(activeNotebookId) : Promise.resolve(null)),
    [activeNotebookId],
  )
  const activeFolderId = activeNotebookId ? (activeNotebook?.folderId ?? null) : currentFolderId

  return (
    <SidebarSection title="Folders">
      <FolderTree activeFolderId={activeFolderId} activeNotebookId={activeNotebookId} />
    </SidebarSection>
  )
}
