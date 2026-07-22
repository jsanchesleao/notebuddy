import { useRef, useState } from 'react'
import { Icon } from '../../../../components/Icon/Icon'
import type { NoteBlock, TableCell } from '../../../../domain/blocks/blocks.types'
import styles from './TableBlock.module.css'

const SAVE_DEBOUNCE_MS = 500

interface TableBlockProps {
  block: Extract<NoteBlock, { type: 'table' }>
  onUpdate: (patch: { rows: TableCell[][] }) => void
}

export function TableBlock({ block, onUpdate }: TableBlockProps) {
  const [rows, setRows] = useState<TableCell[][]>(block.rows)
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const commit = (next: TableCell[][], immediate = false) => {
    setRows(next)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current)
    if (immediate) {
      onUpdate({ rows: next })
      return
    }
    saveTimeoutRef.current = setTimeout(() => onUpdate({ rows: next }), SAVE_DEBOUNCE_MS)
  }

  const setCell = (rowIndex: number, colIndex: number, value: string) => {
    const next = rows.map((row, r) =>
      r === rowIndex ? row.map((cell, c) => (c === colIndex ? { value } : cell)) : row,
    )
    commit(next)
  }

  const columnCount = rows[0]?.length ?? 0

  const addRow = () => {
    commit([...rows, Array.from({ length: columnCount }, () => ({ value: '' }))], true)
  }

  const removeRow = (rowIndex: number) => {
    if (rows.length <= 1) return
    commit(
      rows.filter((_, r) => r !== rowIndex),
      true,
    )
  }

  const addColumn = () => {
    commit(
      rows.map((row) => [...row, { value: '' }]),
      true,
    )
  }

  const removeColumn = (colIndex: number) => {
    if (columnCount <= 1) return
    commit(
      rows.map((row) => row.filter((_, c) => c !== colIndex)),
      true,
    )
  }

  return (
    <div className={styles.tableBlock}>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, colIndex) => (
                  <td key={colIndex}>
                    <input
                      className={styles.cell}
                      value={cell.value}
                      onChange={(event) => setCell(rowIndex, colIndex, event.target.value)}
                      aria-label={`Row ${rowIndex + 1}, column ${colIndex + 1}`}
                    />
                  </td>
                ))}
                <td className={styles.rowAction}>
                  <button
                    type="button"
                    className={styles.smallButton}
                    onClick={() => removeRow(rowIndex)}
                    aria-label={`Delete row ${rowIndex + 1}`}
                    disabled={rows.length <= 1}
                  >
                    <Icon name="delete" size={12} />
                  </button>
                </td>
              </tr>
            ))}
            <tr>
              {Array.from({ length: columnCount }, (_, colIndex) => (
                <td key={colIndex} className={styles.columnAction}>
                  <button
                    type="button"
                    className={styles.smallButton}
                    onClick={() => removeColumn(colIndex)}
                    aria-label={`Delete column ${colIndex + 1}`}
                    disabled={columnCount <= 1}
                  >
                    <Icon name="delete" size={12} />
                  </button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className={styles.footer}>
        <button type="button" className={styles.addButton} onClick={addRow}>
          <Icon name="add" size={12} /> Row
        </button>
        <button type="button" className={styles.addButton} onClick={addColumn}>
          <Icon name="add" size={12} /> Column
        </button>
      </div>
    </div>
  )
}
