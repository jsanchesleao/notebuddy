import { getFolder, listFolderAncestors } from '../../domain/folders/folderRepository'
import { getNotebook } from '../../domain/notebooks/notebookRepository'
import type { Note } from '../../domain/entities.types'

export interface BreadcrumbItem {
  label: string
  to?: string
}

const HOME_CRUMB: BreadcrumbItem = { label: 'Home', to: '/' }

export async function buildFolderCrumbs(folderId: string | null): Promise<BreadcrumbItem[]> {
  if (!folderId) return [HOME_CRUMB]

  const folder = await getFolder(folderId)
  if (!folder) return [HOME_CRUMB]

  const ancestors = await listFolderAncestors(folderId)
  return [
    HOME_CRUMB,
    ...ancestors.map((ancestor) => ({ label: ancestor.title, to: `/folders/${ancestor.id}` })),
    { label: folder.title, to: `/folders/${folder.id}` },
  ]
}

export async function buildNotebookCrumbs(notebookId: string): Promise<BreadcrumbItem[]> {
  const notebook = await getNotebook(notebookId)
  if (!notebook) return [HOME_CRUMB]

  const folderCrumbs = await buildFolderCrumbs(notebook.folderId)
  return [...folderCrumbs, { label: notebook.title, to: `/notebooks/${notebook.id}` }]
}

export async function buildNoteCrumbs(note: Note): Promise<BreadcrumbItem[]> {
  if (note.notebookId) {
    const notebookCrumbs = await buildNotebookCrumbs(note.notebookId)
    return [...notebookCrumbs, { label: note.title }]
  }

  return [HOME_CRUMB, { label: note.title }]
}
