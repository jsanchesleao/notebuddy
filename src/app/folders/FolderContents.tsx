import { useLiveQuery } from 'dexie-react-hooks'
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

  return (
    <div className={styles.contents}>
      <section className={styles.section}>
        <h2 className={styles.heading}>Folders</h2>
        {folders?.length === 0 && <p className={styles.empty}>No folders yet</p>}
        <ul className={styles.list}>
          {folders?.map((folder) => (
            <li key={folder.id}>
              <EditableEntityRow
                title={folder.title}
                to={`/folders/${folder.id}`}
                onRename={(title) => renameFolder(folder.id, title)}
                onDelete={() => deleteFolder(folder.id)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Notebooks</h2>
        {notebooks?.length === 0 && <p className={styles.empty}>No notebooks yet</p>}
        <ul className={styles.list}>
          {notebooks?.map((notebook) => (
            <li key={notebook.id}>
              <EditableEntityRow
                title={notebook.title}
                to={`/notebooks/${notebook.id}`}
                onRename={(title) => renameNotebook(notebook.id, title)}
                onDelete={() => deleteNotebook(notebook.id)}
              />
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.heading}>Boards</h2>
        {boards?.length === 0 && <p className={styles.empty}>No boards yet</p>}
        <ul className={styles.list}>
          {boards?.map((board) => (
            <li key={board.id}>{board.title}</li>
          ))}
        </ul>
      </section>
    </div>
  )
}
