import { useState } from 'react'
import { Drawer } from '../../../components/Drawer/Drawer'
import { Modal } from '../../../components/Modal/Modal'
import { useIsDesktop } from '../../useIsDesktop'
import { PropertiesPanelContent } from './PropertiesPanelContent'
import type { Note } from '../../../domain/entities.types'

const TITLE_ID = 'properties-panel-title'

interface PropertiesPanelProps {
  note: Note
  open: boolean
  onClose: () => void
}

export function PropertiesPanel({ note, open, onClose }: PropertiesPanelProps) {
  const [mode, setMode] = useState<'drawer' | 'modal'>('drawer')
  const isDesktop = useIsDesktop()
  // Detach is a desktop-only affordance: if the viewport shrinks below desktop
  // while detached, fall back to the drawer without needing an effect.
  const effectiveMode = isDesktop ? mode : 'drawer'

  const handleClose = () => {
    setMode('drawer')
    onClose()
  }

  const content = (
    <PropertiesPanelContent
      note={note}
      mode={effectiveMode}
      onDetach={() => setMode((current) => (current === 'drawer' ? 'modal' : 'drawer'))}
      onClose={handleClose}
      showDetachToggle={isDesktop}
      titleId={TITLE_ID}
    />
  )

  if (effectiveMode === 'modal') {
    return (
      <Modal open={open} onClose={handleClose} labelledBy={TITLE_ID}>
        {content}
      </Modal>
    )
  }

  return (
    <Drawer open={open} onClose={handleClose} labelledBy={TITLE_ID}>
      {content}
    </Drawer>
  )
}
