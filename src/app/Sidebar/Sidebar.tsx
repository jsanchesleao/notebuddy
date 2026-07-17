import { SidebarSection } from './SidebarSection'
import styles from './Sidebar.module.css'

interface SidebarProps {
  open: boolean
}

export function Sidebar({ open }: SidebarProps) {
  return (
    <nav className={`${styles.sidebar} ${open ? styles.open : ''}`} aria-label="Primary">
      <SidebarSection title="Folders">
        <p className={styles.empty}>No folders yet</p>
      </SidebarSection>
      <SidebarSection title="Notebooks">
        <p className={styles.empty}>No notebooks yet</p>
      </SidebarSection>
      <SidebarSection title="Boards">
        <p className={styles.empty}>No boards yet</p>
      </SidebarSection>
    </nav>
  )
}
