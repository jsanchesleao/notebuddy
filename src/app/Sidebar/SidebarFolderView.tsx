import { useLiveQuery } from 'dexie-react-hooks'
import { SidebarSection } from './SidebarSection'
import { FolderTree } from './FolderTree'
import { getNotebook } from '../../domain/notebooks/notebookRepository'
import { getBoard } from '../../domain/boards/boardRepository'

interface SidebarFolderViewProps {
  currentFolderId: string | null
  activeNotebookId: string | null
  activeBoardId: string | null
}

export function SidebarFolderView({
  currentFolderId,
  activeNotebookId,
  activeBoardId,
}: SidebarFolderViewProps) {
  const activeNotebook = useLiveQuery(
    () => (activeNotebookId ? getNotebook(activeNotebookId) : Promise.resolve(null)),
    [activeNotebookId],
  )
  const activeBoard = useLiveQuery(
    () => (activeBoardId ? getBoard(activeBoardId) : Promise.resolve(null)),
    [activeBoardId],
  )
  const activeFolderId = activeNotebookId
    ? (activeNotebook?.folderId ?? null)
    : activeBoardId
      ? (activeBoard?.folderId ?? null)
      : currentFolderId

  return (
    <SidebarSection title="Folders">
      <FolderTree
        activeFolderId={activeFolderId}
        activeNotebookId={activeNotebookId}
        activeBoardId={activeBoardId}
      />
    </SidebarSection>
  )
}
