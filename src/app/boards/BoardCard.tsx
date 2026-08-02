import { Link } from 'react-router-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '../../components/Icon/Icon'
import { useOpfsBlobUrl } from '../notes/useOpfsBlobUrl'
import type { Note } from '../../domain/entities.types'
import styles from './BoardCard.module.css'

interface BoardCardProps {
  note: Note
}

export function BoardCard({ note }: BoardCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: note.id,
    data: { type: 'card' },
  })
  const imageUrl = useOpfsBlobUrl(note.cardImagePath ?? '')

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div ref={setNodeRef} style={style} className={styles.card}>
      <button
        type="button"
        className={styles.gripButton}
        aria-label={`Reorder ${note.title}`}
        {...attributes}
        {...listeners}
      >
        <Icon name="grip" size={12} />
      </button>
      <Link to={`/notes/${note.id}`} className={styles.link}>
        {imageUrl && <img src={imageUrl} alt="" className={styles.thumbnail} />}
        <span className={styles.title}>{note.title}</span>
        {note.description && <span className={styles.description}>{note.description}</span>}
      </Link>
    </div>
  )
}
