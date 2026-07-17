import { Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { FolderPage } from './pages/FolderPage'
import { NotebookPage } from './pages/NotebookPage'
import { NotePage } from './pages/NotePage'
import { NotFoundPage } from './pages/NotFoundPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/folders/:folderId" element={<FolderPage />} />
      <Route path="/notebooks/:notebookId" element={<NotebookPage />} />
      <Route path="/notes/:noteId" element={<NotePage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
