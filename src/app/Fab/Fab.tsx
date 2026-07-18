import { useState, type FormEvent } from 'react'
import { createFolder } from '../../domain/folders/folderRepository'
import { createNotebook } from '../../domain/notebooks/notebookRepository'
import { createNote } from '../../domain/notes/noteRepository'
import { Icon } from '../../components/Icon/Icon'
import styles from './Fab.module.css'

interface FabProps {
  folderId: string | null
  notebookId: string | null
}

type CreateAction = 'folder' | 'notebook' | 'note'

const ACTION_LABELS: Record<CreateAction, string> = {
  folder: 'Folder',
  notebook: 'Notebook',
  note: 'Note',
}

export function Fab({ folderId, notebookId }: FabProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeAction, setActiveAction] = useState<CreateAction | null>(null)
  const [title, setTitle] = useState('')

  const availableActions: CreateAction[] = notebookId
    ? ['folder', 'notebook', 'note']
    : ['folder', 'notebook']

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
    } else if (activeAction === 'notebook') {
      await createNotebook({ folderId, title: trimmed })
    } else if (notebookId) {
      await createNote({ notebookId, title: trimmed })
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
          autoFocus
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
          {availableActions.map((action) => (
            <button
              key={action}
              type="button"
              className={styles.menuItem}
              onClick={() => setActiveAction(action)}
            >
              <Icon name="add" size={14} /> New {ACTION_LABELS[action]}
            </button>
          ))}
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
    </div>
  )
}
