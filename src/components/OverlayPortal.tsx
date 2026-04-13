import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

interface OverlayPortalProps {
  children: ReactNode
}

function OverlayPortal({ children }: OverlayPortalProps) {
  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(children, document.body)
}

export default OverlayPortal
