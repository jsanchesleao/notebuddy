import { Link } from 'react-router-dom'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Icon } from '../../components/Icon/Icon'
import { TagPill } from '../../components/TagPill/TagPill'
import { useOpfsBlobUrl } from '../notes/useOpfsBlobUrl'
import type { Note } from '../../domain/entities.types'
import styles from './BoardCard.module.css'

interface BoardCardProps {
  note: Note
  tagColors: Map<string, string>
}

export function BoardCard({ note, tagColors }: BoardCardProps) {
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
    <div
      ref={setNodeRef}
      style={style}
      className={styles.card}
      aria-label={`Reorder ${note.title}`}
      {...attributes}
      {...listeners}
    >
      <span className={styles.gripButton}>
        <Icon name="grip" size={12} />
      </span>
      <Link to={`/notes/${note.id}`} className={styles.link}>
        {imageUrl && <img src={imageUrl} alt="" className={styles.thumbnail} />}
        <span className={styles.title}>{note.title}</span>
        {note.description && <span className={styles.description}>{note.description}</span>}
        {note.metadata.tags.length > 0 && (
          <span className={styles.tags}>
            {note.metadata.tags.map((tag) => (
              <TagPill key={tag} name={tag} color={tagColors.get(tag) ?? '#888888'} />
            ))}
          </span>
        )}
      </Link>
    </div>
  )
}
