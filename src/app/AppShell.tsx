import { useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Sidebar } from './Sidebar/Sidebar'
import { Fab } from './Fab/Fab'
import { ThemeToggle } from '../theme/ThemeToggle'
import { AppRoutes } from './routes'
import { useCurrentRouteContext } from './routeContext'
import { useSidebarOpen } from './useSidebarOpen'
import { useIsMobile } from './useIsMobile'
import { useHeaderCompact } from './useHeaderCompact'
import { Icon } from '../components/Icon/Icon'
import { getNotebook } from '../domain/notebooks/notebookRepository'
import { getBoard } from '../domain/boards/boardRepository'
import styles from './AppShell.module.css'

export function AppShell() {
  const { open: sidebarOpen, toggle: toggleSidebar, setOpen: setSidebarOpen } = useSidebarOpen()
  const { routeKind, folderId, notebookId, boardId, noteId } = useCurrentRouteContext()
  const showFab =
    routeKind === 'home' ||
    routeKind === 'folder' ||
    routeKind === 'notebook' ||
    routeKind === 'board'
  const mainRef = useRef<HTMLElement>(null)
  const isMobile = useIsMobile()
  const headerCompact = useHeaderCompact(mainRef, isMobile)
  const notebook =
    useLiveQuery(
      () =>
        notebookId ? getNotebook(notebookId).then((found) => found ?? null) : Promise.resolve(null),
      [notebookId],
    ) ?? null
  const board =
    useLiveQuery(
      () => (boardId ? getBoard(boardId).then((found) => found ?? null) : Promise.resolve(null)),
      [boardId],
    ) ?? null

  return (
    <div className={`${styles.shell} ${headerCompact ? styles.headerCompact : ''}`}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={toggleSidebar}
          aria-expanded={sidebarOpen}
          aria-label="Toggle navigation"
        >
          <Icon name="menu" />
        </button>
        <span className={styles.title}>Notebuddy</span>
        <ThemeToggle />
      </header>
      <div
        className={`${styles.backdrop} ${sidebarOpen ? styles.backdropOpen : ''}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />
      <div className={styles.body}>
        <Sidebar
          open={sidebarOpen}
          routeKind={routeKind}
          folderId={folderId}
          notebookId={notebookId}
          boardId={boardId}
          noteId={noteId}
        />
        <main className={styles.main} ref={mainRef}>
          <AppRoutes />
        </main>
      </div>
      {showFab && <Fab folderId={folderId} notebook={notebook} board={board} />}
    </div>
  )
}
