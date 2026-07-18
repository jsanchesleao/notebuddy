import { useState } from 'react'
import { Sidebar } from './Sidebar/Sidebar'
import { Fab } from './Fab/Fab'
import { ThemeToggle } from '../theme/ThemeToggle'
import { AppRoutes } from './routes'
import { useCurrentRouteContext } from './routeContext'
import { Icon } from '../components/Icon/Icon'
import styles from './AppShell.module.css'

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { folderId, notebookId } = useCurrentRouteContext()

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <button
          type="button"
          className={styles.menuButton}
          onClick={() => setSidebarOpen((open) => !open)}
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
        <Sidebar open={sidebarOpen} currentFolderId={folderId} />
        <main className={styles.main}>
          <AppRoutes />
        </main>
      </div>
      <Fab folderId={folderId} notebookId={notebookId} />
    </div>
  )
}
