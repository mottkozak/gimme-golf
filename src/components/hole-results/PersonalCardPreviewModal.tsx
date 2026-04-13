import type { PersonalCard } from '../../types/cards.ts'
import { adaptChallengeTextToSkillLevel } from '../../logic/challengeText.ts'
import Modal from '../Modal.tsx'

interface PersonalCardPreviewState {
  playerName: string
  expectedScore18: number
  personalPar: number
  targetStrokes: number | null
  card: PersonalCard
}

interface PersonalCardPreviewModalProps {
  preview: PersonalCardPreviewState
  onClose: () => void
}

function PersonalCardPreviewModal({ preview, onClose }: PersonalCardPreviewModalProps) {
  return (
    <Modal onClose={onClose} labelledBy="personal-card-preview-title">
      <div className="row-between">
        <h3 id="personal-card-preview-title">{preview.card.name}</h3>
        <button type="button" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="muted">
        {preview.playerName} | {preview.card.code}
      </p>
      <p>{adaptChallengeTextToSkillLevel(preview.card.description, preview.expectedScore18)}</p>
    </Modal>
  )
}

export default PersonalCardPreviewModal
