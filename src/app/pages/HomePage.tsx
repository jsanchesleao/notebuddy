import styles from './HomePage.module.css'

export function HomePage() {
  return (
    <div className={`content ${styles.home}`}>
      <h1>Welcome to Notebuddy</h1>
      <p>Create a folder, notebook, or board to get started.</p>
    </div>
  )
}
