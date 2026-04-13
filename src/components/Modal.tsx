import type { ReactNode } from 'react'
import OverlayPortal from './OverlayPortal.tsx'

interface ModalProps {
  children: ReactNode
  onClose: () => void
  labelledBy?: string
  className?: string
}

function Modal({ children, onClose, labelledBy, className = 'panel modal-card stack-xs' }: ModalProps) {
  return (
    <OverlayPortal>
      <div className="modal-backdrop" role="presentation" onClick={onClose}>
        <section
          className={className}
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelledBy}
          onClick={(event) => event.stopPropagation()}
        >
          {children}
        </section>
      </div>
    </OverlayPortal>
  )
}

export default Modal
