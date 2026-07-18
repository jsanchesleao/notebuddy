import { BLOCK_TYPE_CATALOG, type BlockTypeCatalogEntry } from '../blockTypeCatalog'

export function parseSlashQuery(text: string): string | null {
  const match = /^\/([^\s/]*)$/.exec(text)
  return match ? match[1] : null
}

export function filterBlockTypes(query: string): BlockTypeCatalogEntry[] {
  return BLOCK_TYPE_CATALOG.filter(({ label }) =>
    label.toLowerCase().startsWith(query.toLowerCase()),
  )
}
