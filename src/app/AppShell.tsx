import { useState } from 'react'
import { Sidebar } from './Sidebar/Sidebar'
import { ThemeToggle } from '../theme/ThemeToggle'
import { AppRoutes } from './routes'
import styles from './AppShell.module.css'

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

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
          ☰
        </button>
        <span className={styles.title}>Notebuddy</span>
        <ThemeToggle />
      </header>
      <div className={styles.body}>
        <Sidebar open={sidebarOpen} />
        <main className={styles.main}>
          <AppRoutes />
        </main>
      </div>
    </div>
  )
}
