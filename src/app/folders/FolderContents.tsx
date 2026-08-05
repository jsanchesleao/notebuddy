import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { EditableEntityRow } from '../common/EditableEntityRow'
import {
  deleteFolder,
  listFoldersByParent,
  moveFolder,
  renameFolder,
} from '../../domain/folders/folderRepository'
import {
  deleteNotebook,
  listNotebooksByFolder,
  moveNotebook,
  renameNotebook,
} from '../../domain/notebooks/notebookRepository'
import {
  deleteBoard,
  listBoardsByFolder,
  moveBoard,
  renameBoard,
} from '../../domain/boards/boardRepository'
import { FolderPickerModal } from './FolderPickerModal'
import type { Board, Folder, Notebook } from '../../domain/entities.types'
import styles from './FolderContents.module.css'

interface FolderContentsProps {
  parentFolderId: string | null
}

export function FolderContents({ parentFolderId }: FolderContentsProps) {
  const folders = useLiveQuery(() => listFoldersByParent(parentFolderId), [parentFolderId])
  const notebooks = useLiveQuery(() => listNotebooksByFolder(parentFolderId), [parentFolderId])
  const boards = useLiveQuery(() => listBoardsByFolder(parentFolderId), [parentFolderId])
  const [movingFolder, setMovingFolder] = useState<Folder | null>(null)
  const [movingNotebook, setMovingNotebook] = useState<Notebook | null>(null)
  const [movingBoard, setMovingBoard] = useState<Board | null>(null)

  const isEmpty = folders?.length === 0 && notebooks?.length === 0 && boards?.length === 0

  if (isEmpty) {
    return <p className={styles.empty}>Use the + button to create a folder, notebook, or board.</p>
  }

  return (
    <>
      <ul className={styles.list}>
        {folders?.map((folder) => (
          <li key={folder.id}>
            <EditableEntityRow
              title={folder.title}
              icon="folder"
              to={`/folders/${folder.id}`}
              onRename={(title) => renameFolder(folder.id, title)}
              onMove={() => setMovingFolder(folder)}
              onDelete={() => deleteFolder(folder.id)}
            />
          </li>
        ))}
        {notebooks?.map((notebook) => (
          <li key={notebook.id}>
            <EditableEntityRow
              title={notebook.title}
              icon="book"
              to={`/notebooks/${notebook.id}`}
              onRename={(title) => renameNotebook(notebook.id, title)}
              onMove={() => setMovingNotebook(notebook)}
              onDelete={() => deleteNotebook(notebook.id)}
            />
          </li>
        ))}
        {boards?.map((board) => (
          <li key={board.id}>
            <EditableEntityRow
              title={board.title}
              icon="board"
              to={`/boards/${board.id}`}
              onRename={(title) => renameBoard(board.id, title)}
              onMove={() => setMovingBoard(board)}
              onDelete={() => deleteBoard(board.id)}
            />
          </li>
        ))}
      </ul>
      {movingFolder && (
        <FolderPickerModal
          onClose={() => setMovingFolder(null)}
          entityLabel="folder"
          currentParentFolderId={movingFolder.parentFolderId}
          disabledId={movingFolder.id}
          onConfirm={(targetFolderId) => moveFolder(movingFolder.id, targetFolderId)}
        />
      )}
      {movingNotebook && (
        <FolderPickerModal
          onClose={() => setMovingNotebook(null)}
          entityLabel="notebook"
          currentParentFolderId={movingNotebook.folderId}
          onConfirm={(targetFolderId) => moveNotebook(movingNotebook.id, targetFolderId)}
        />
      )}
      {movingBoard && (
        <FolderPickerModal
          onClose={() => setMovingBoard(null)}
          entityLabel="board"
          currentParentFolderId={movingBoard.folderId}
          onConfirm={(targetFolderId) => moveBoard(movingBoard.id, targetFolderId)}
        />
      )}
    </>
  )
}
