import { Route, Routes } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { FolderPage } from './pages/FolderPage'
import { NotebookPage } from './pages/NotebookPage'
import { BoardPage } from './pages/BoardPage'
import { NotePage } from './pages/NotePage'
import { DataTypesPage } from './pages/DataTypesPage'
import { SearchPage } from './pages/SearchPage'
import { NotFoundPage } from './pages/NotFoundPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/folders/:folderId" element={<FolderPage />} />
      <Route path="/notebooks/:notebookId" element={<NotebookPage />} />
      <Route path="/boards/:boardId" element={<BoardPage />} />
      <Route path="/notes/:noteId" element={<NotePage />} />
      <Route path="/data-types" element={<DataTypesPage />} />
      <Route path="/search" element={<SearchPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
