import { FolderContents } from '../folders/FolderContents'
import styles from './HomePage.module.css'

export function HomePage() {
  return (
    <div className={styles.home}>
      <div className="content">
        <h1>Welcome to Notebuddy</h1>
        <p>Create a folder, notebook, or board to get started.</p>
      </div>
      <FolderContents parentFolderId={null} />
    </div>
  )
}
