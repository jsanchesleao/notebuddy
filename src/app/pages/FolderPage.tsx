import { useEffect, useRef } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { faFolder } from '@fortawesome/free-solid-svg-icons'
import { deleteFolder, getFolder, renameFolder } from '../../domain/folders/folderRepository'
import { EntityPageHeader } from '../common/EntityPageHeader'
import { FolderContents } from '../folders/FolderContents'
import styles from './FolderPage.module.css'

export function FolderPage() {
  const { folderId } = useParams<{ folderId: string }>()
  const navigate = useNavigate()
  const isDeletingRef = useRef(false)

  const folder = useLiveQuery(
    () => (folderId ? getFolder(folderId).then((found) => found ?? null) : Promise.resolve(null)),
    [folderId],
  )

  const notFound = folder === null || !folderId

  useEffect(() => {
    // A null result can mean "not found" or "we just deleted it ourselves and are
    // about to navigate to the parent" (see onDelete below) — only auto-redirect for
    // the former, otherwise this would race our own explicit navigate() call.
    if (notFound && !isDeletingRef.current) {
      navigate('/', { replace: true })
    }
  }, [notFound, navigate])

  if (folder === undefined || notFound) return null

  const backTo = folder.parentFolderId ? `/folders/${folder.parentFolderId}` : '/'

  return (
    <div className={styles.page}>
      <Link to={backTo} className={styles.breadcrumb}>
        ← Back
      </Link>
      <EntityPageHeader
        title={folder.title}
        icon={faFolder}
        entityLabel="folder"
        onRename={(title) => renameFolder(folder.id, title)}
        onDelete={async () => {
          isDeletingRef.current = true
          await deleteFolder(folder.id)
          navigate(backTo, { replace: true })
        }}
      />
      <FolderContents parentFolderId={folder.id} />
    </div>
  )
}
