import { Sidebar } from './Sidebar/Sidebar'
import { Fab } from './Fab/Fab'
import { ThemeToggle } from '../theme/ThemeToggle'
import { AppRoutes } from './routes'
import { useCurrentRouteContext } from './routeContext'
import { useSidebarOpen } from './useSidebarOpen'
import { Icon } from '../components/Icon/Icon'
import styles from './AppShell.module.css'

export function AppShell() {
  const { open: sidebarOpen, toggle: toggleSidebar, setOpen: setSidebarOpen } = useSidebarOpen()
  const { routeKind, folderId, notebookId, noteId } = useCurrentRouteContext()
  const showFab = routeKind === 'home' || routeKind === 'folder' || routeKind === 'notebook'

  return (
    <div className={styles.shell}>
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
          noteId={noteId}
        />
        <main className={styles.main}>
          <AppRoutes />
        </main>
      </div>
      {showFab && <Fab folderId={folderId} notebookId={notebookId} />}
    </div>
  )
}
