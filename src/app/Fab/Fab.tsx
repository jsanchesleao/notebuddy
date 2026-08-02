import { useState, type FormEvent } from 'react'
import { createFolder } from '../../domain/folders/folderRepository'
import { createNotebook } from '../../domain/notebooks/notebookRepository'
import { Icon } from '../../components/Icon/Icon'
import { NoteCreateModal } from '../notes/NoteCreateModal'
import { BoardCreateModal } from '../boards/BoardCreateModal'
import type { Board, Notebook } from '../../domain/entities.types'
import styles from './Fab.module.css'

interface FabProps {
  folderId: string | null
  notebook: Notebook | null
  board?: Board | null
}

type PopoverAction = 'folder' | 'notebook'

const ACTION_LABELS: Record<PopoverAction, string> = {
  folder: 'Folder',
  notebook: 'Notebook',
}

export function Fab({ folderId, notebook, board = null }: FabProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeAction, setActiveAction] = useState<PopoverAction | null>(null)
  const [title, setTitle] = useState('')
  const [noteModalOpen, setNoteModalOpen] = useState(false)
  const [cardModalOpen, setCardModalOpen] = useState(false)
  const [boardModalOpen, setBoardModalOpen] = useState(false)

  const showNoteAction = Boolean(notebook)
  const showCardAction = Boolean(board)

  const closeAll = () => {
    setMenuOpen(false)
    setActiveAction(null)
    setTitle('')
  }

  const backToMenu = () => {
    setActiveAction(null)
    setTitle('')
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed || !activeAction) return

    if (activeAction === 'folder') {
      await createFolder({ parentFolderId: folderId, title: trimmed })
    } else {
      await createNotebook({ folderId, title: trimmed })
    }

    closeAll()
  }

  if (activeAction) {
    return (
      <form className={styles.popover} onSubmit={handleSubmit}>
        <input
          type="text"
          className={styles.input}
          placeholder={`${ACTION_LABELS[activeAction]} title`}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') backToMenu()
          }}
          aria-label={`New ${ACTION_LABELS[activeAction].toLowerCase()} title`}
        />
        <button type="submit" className={styles.submit}>
          Add
        </button>
        <button type="button" className={styles.cancel} onClick={backToMenu}>
          Cancel
        </button>
      </form>
    )
  }

  return (
    <div className={styles.container}>
      {menuOpen && (
        <div className={styles.menu}>
          {(['folder', 'notebook'] as const).map((action) => (
            <button
              key={action}
              type="button"
              className={styles.menuItem}
              onClick={() => setActiveAction(action)}
            >
              <Icon name="add" size={14} /> New {ACTION_LABELS[action]}
            </button>
          ))}
          <button
            type="button"
            className={styles.menuItem}
            onClick={() => {
              setMenuOpen(false)
              setBoardModalOpen(true)
            }}
          >
            <Icon name="add" size={14} /> New Board
          </button>
          {showNoteAction && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                setMenuOpen(false)
                setNoteModalOpen(true)
              }}
            >
              <Icon name="add" size={14} /> New Note
            </button>
          )}
          {showCardAction && (
            <button
              type="button"
              className={styles.menuItem}
              onClick={() => {
                setMenuOpen(false)
                setCardModalOpen(true)
              }}
            >
              <Icon name="add" size={14} /> New Card
            </button>
          )}
        </div>
      )}
      <button
        type="button"
        className={styles.fab}
        aria-label="Create"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <Icon name="add" />
      </button>
      {showNoteAction && (
        <NoteCreateModal
          open={noteModalOpen}
          onClose={() => setNoteModalOpen(false)}
          notebook={notebook}
        />
      )}
      {showCardAction && board && (
        <NoteCreateModal
          open={cardModalOpen}
          onClose={() => setCardModalOpen(false)}
          notebook={null}
          boardId={board.id}
        />
      )}
      <BoardCreateModal
        open={boardModalOpen}
        onClose={() => setBoardModalOpen(false)}
        folderId={folderId}
      />
    </div>
  )
}
