import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { listFoldersByParent } from '../../domain/folders/folderRepository'
import { Icon } from '../../components/Icon/Icon'
import type { Folder } from '../../domain/entities.types'
import { getRowPaddingLeft } from '../common/treeIndent'
import styles from './FolderPickerModal.module.css'

interface FolderPickerTreeProps {
  parentFolderId: string | null
  depth: number
  disabledId: string
  disabledSubtree: boolean
  selectedId: string | null
  onSelect: (folderId: string) => void
}

export function FolderPickerTree({
  parentFolderId,
  depth,
  disabledId,
  disabledSubtree,
  selectedId,
  onSelect,
}: FolderPickerTreeProps) {
  const folders = useLiveQuery(() => listFoldersByParent(parentFolderId), [parentFolderId])

  if (!folders?.length) return null

  return (
    <ul className={styles.list}>
      {folders.map((folder) => (
        <FolderPickerNode
          key={folder.id}
          folder={folder}
          depth={depth}
          disabledId={disabledId}
          disabledSubtree={disabledSubtree}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      ))}
    </ul>
  )
}

interface FolderPickerNodeProps {
  folder: Folder
  depth: number
  disabledId: string
  disabledSubtree: boolean
  selectedId: string | null
  onSelect: (folderId: string) => void
}

function FolderPickerNode({
  folder,
  depth,
  disabledId,
  disabledSubtree,
  selectedId,
  onSelect,
}: FolderPickerNodeProps) {
  const [expanded, setExpanded] = useState(false)
  const isDisabled = disabledSubtree || folder.id === disabledId

  return (
    <li>
      <div className={styles.row} style={{ paddingLeft: `${getRowPaddingLeft(depth)}px` }}>
        <button
          type="button"
          className={styles.toggle}
          aria-label={expanded ? `Collapse ${folder.title}` : `Expand ${folder.title}`}
          aria-expanded={expanded}
          onClick={() => setExpanded((prev) => !prev)}
        >
          <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={12} />
        </button>
        <button
          type="button"
          className={
            selectedId === folder.id ? `${styles.option} ${styles.selected}` : styles.option
          }
          disabled={isDisabled}
          onClick={() => onSelect(folder.id)}
        >
          <Icon name="folder" size={12} /> {folder.title}
        </button>
      </div>
      {expanded && (
        <FolderPickerTree
          parentFolderId={folder.id}
          depth={depth + 1}
          disabledId={disabledId}
          disabledSubtree={isDisabled}
          selectedId={selectedId}
          onSelect={onSelect}
        />
      )}
    </li>
  )
}
