import { Link } from 'react-router-dom'
import { Icon } from '../../components/Icon/Icon'
import type { BreadcrumbItem } from './breadcrumbs'
import styles from './Breadcrumb.module.css'

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      {items.map((item, index) => {
        const isLast = index === items.length - 1
        return (
          <span key={index} className={styles.crumb}>
            {index > 0 && <Icon name="chevronRight" size={12} className={styles.separator} />}
            {item.to && !isLast ? (
              <Link to={item.to} className={styles.crumbLink}>
                {item.label}
              </Link>
            ) : (
              <span aria-current={isLast ? 'page' : undefined} className={styles.crumbCurrent}>
                {item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
