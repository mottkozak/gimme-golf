import type { PowerUp } from '../../data/powerUps.ts'
import Modal from '../Modal.tsx'

interface PowerUpCardPreviewState {
  playerName: string
  card: PowerUp
}

interface PowerUpCardPreviewModalProps {
  preview: PowerUpCardPreviewState
  onClose: () => void
}

function PowerUpCardPreviewModal({ preview, onClose }: PowerUpCardPreviewModalProps) {
  const cardTypeLabel = preview.card.cardKind === 'curse' ? 'Curse' : 'Power Up'

  return (
    <Modal onClose={onClose} labelledBy="power-up-card-preview-title">
      <div className="row-between">
        <h3 id="power-up-card-preview-title">{preview.card.title}</h3>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="muted">
        {preview.playerName} | {preview.card.code} | {cardTypeLabel}
      </p>
      <p>{preview.card.description}</p>
    </Modal>
  )
}

export default PowerUpCardPreviewModal
