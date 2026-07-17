import { useLiveQuery } from 'dexie-react-hooks'
import { faBook, faChalkboard, faFolder } from '@fortawesome/free-solid-svg-icons'
import { EditableEntityRow } from '../common/EditableEntityRow'
import { deleteFolder, listFoldersByParent, renameFolder } from '../../domain/folders/folderRepository'
import {
  deleteNotebook,
  listNotebooksByFolder,
  renameNotebook,
} from '../../domain/notebooks/notebookRepository'
import { listBoardsByFolder } from '../../domain/boards/boardRepository'
import styles from './FolderContents.module.css'

interface FolderContentsProps {
  parentFolderId: string | null
}

export function FolderContents({ parentFolderId }: FolderContentsProps) {
  const folders = useLiveQuery(() => listFoldersByParent(parentFolderId), [parentFolderId])
  const notebooks = useLiveQuery(() => listNotebooksByFolder(parentFolderId), [parentFolderId])
  const boards = useLiveQuery(() => listBoardsByFolder(parentFolderId), [parentFolderId])

  const isEmpty = folders?.length === 0 && notebooks?.length === 0 && boards?.length === 0

  if (isEmpty) {
    return <p className={styles.empty}>Use the + button to create a folder, notebook, or board.</p>
  }

  return (
    <ul className={styles.list}>
      {folders?.map((folder) => (
        <li key={folder.id}>
          <EditableEntityRow
            title={folder.title}
            icon={faFolder}
            to={`/folders/${folder.id}`}
            onRename={(title) => renameFolder(folder.id, title)}
            onDelete={() => deleteFolder(folder.id)}
          />
        </li>
      ))}
      {notebooks?.map((notebook) => (
        <li key={notebook.id}>
          <EditableEntityRow
            title={notebook.title}
            icon={faBook}
            to={`/notebooks/${notebook.id}`}
            onRename={(title) => renameNotebook(notebook.id, title)}
            onDelete={() => deleteNotebook(notebook.id)}
          />
        </li>
      ))}
      {boards?.map((board) => (
        <li key={board.id}>
          <EditableEntityRow title={board.title} icon={faChalkboard} />
        </li>
      ))}
    </ul>
  )
}
