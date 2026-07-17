import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  return (
    <div className={`content ${styles.notFound}`}>
      <h1>Page not found</h1>
      <p>The page you&rsquo;re looking for doesn&rsquo;t exist.</p>
    </div>
  )
}
