import { useState, type CSSProperties } from 'react'
import useInViewport from '../hooks/useInViewport.ts'
import { adaptChallengeTextToSkillLevel } from '../logic/challengeText.ts'
import type { ChallengeLayout } from '../logic/account.ts'
import type { PersonalCard } from '../types/cards.ts'
import BadgeChip from './BadgeChip.tsx'

interface ChallengeCardViewProps {
  card: PersonalCard
  selected: boolean
  offerKind?: 'safe' | 'hard' | 'single'
  offerDetail?: string
  expectedScore18?: number
  showSupplementaryBadges?: boolean
  showMetadataLine?: boolean
  /** When set with layout illustrative, hides title/points/description/badges; metadata is difficulty + card type only (no Option A/B). */
  illustrativeHoleSetupMinimal?: boolean
  layout?: ChallengeLayout
  illustrativeImageSrc?: string | null
  illustrativeImageAlt?: string
  onSelect?: () => void
  entryOrder?: number
}

function getOfferKindLabel(offerKind: ChallengeCardViewProps['offerKind']): string | null {
  if (offerKind === 'safe') {
    return 'Option A'
  }

  if (offerKind === 'hard') {
    return 'Option B'
  }

  if (offerKind === 'single') {
    return 'Assigned'
  }

  return null
}

function toLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function getCardTypeLabel(cardType: PersonalCard['cardType']): string {
  if (cardType === 'common') {
    return 'Classic'
  }

  return toLabel(cardType)
}

function ChallengeCardView({
  card,
  selected,
  offerKind,
  offerDetail,
  expectedScore18,
  showSupplementaryBadges = true,
  showMetadataLine = false,
  illustrativeHoleSetupMinimal = false,
  layout = 'compact',
  illustrativeImageSrc,
  illustrativeImageAlt,
  onSelect,
  entryOrder,
}: ChallengeCardViewProps) {
  const [setInViewportRef, isInViewport] = useInViewport<HTMLElement>({
    once: true,
    threshold: 0.24,
    rootMargin: '0px 0px -8% 0px',
  })
  const [failedIllustrativeImageSrc, setFailedIllustrativeImageSrc] = useState<string | null>(null)
  const offerKindLabel = getOfferKindLabel(offerKind)
  const isSelectable = typeof onSelect === 'function'
  const hasEntryAnimation = typeof entryOrder === 'number'
  const pointsLabel = `${card.points >= 0 ? '+' : ''}${card.points} pts`
  const offerChipTone =
    offerKind === 'safe'
      ? 'safe'
      : offerKind === 'hard'
        ? 'hard'
        : offerKind === 'single'
          ? 'auto'
          : 'default'
  const cardDescription =
    typeof expectedScore18 === 'number'
      ? adaptChallengeTextToSkillLevel(card.description, expectedScore18)
      : card.description
  const metadataLine = [toLabel(card.difficulty), getCardTypeLabel(card.cardType), offerKindLabel]
    .filter((value): value is string => Boolean(value))
    .join(' • ')
  const metadataLineHoleSetupMinimal = [toLabel(card.difficulty), getCardTypeLabel(card.cardType)]
    .filter((value): value is string => Boolean(value))
    .join(' • ')
  const useIllustrativeHoleSetupMinimal = layout === 'illustrative' && illustrativeHoleSetupMinimal
  const entryStyle =
    typeof entryOrder === 'number'
      ? ({
          '--deal-order': String(entryOrder),
        } as CSSProperties)
      : undefined
  const hasIllustrativeImage =
    layout === 'illustrative' &&
    typeof illustrativeImageSrc === 'string' &&
    illustrativeImageSrc.length > 0 &&
    illustrativeImageSrc !== failedIllustrativeImageSrc

  return (
    <article
      className={`panel challenge-card mission-card challenge-card--difficulty-${card.difficulty} ${selected ? 'selected' : ''} ${
        isSelectable ? 'challenge-card--selectable' : ''
      } ${layout === 'illustrative' ? 'challenge-card--illustrative' : 'challenge-card--compact'} ${
        hasEntryAnimation ? 'challenge-card--deal-in' : ''
      } ${
        hasEntryAnimation && isInViewport ? 'is-in-view' : ''
      } offer-${offerKind ?? 'none'} card-category card-category--${card.cardType}${
        useIllustrativeHoleSetupMinimal ? ' challenge-card--illustrative-hole-setup-minimal' : ''
      }`}
      style={entryStyle}
      ref={hasEntryAnimation ? setInViewportRef : undefined}
      role={isSelectable ? 'button' : undefined}
      tabIndex={isSelectable ? 0 : undefined}
      aria-pressed={isSelectable ? selected : undefined}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (!onSelect) {
          return
        }

        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect()
        }
      }}
    >
      {hasIllustrativeImage && (
        <figure className="challenge-card__illustration-frame">
          <img
            className="challenge-card__illustration"
            src={illustrativeImageSrc}
            alt={illustrativeImageAlt ?? `${card.name} challenge card`}
            loading="lazy"
            onError={() => setFailedIllustrativeImageSrc(illustrativeImageSrc)}
          />
        </figure>
      )}
      {!useIllustrativeHoleSetupMinimal && (
        <header className="row-between setup-row-wrap">
          <strong>{card.name}</strong>
          <div className="button-row challenge-card__meta">
            {selected && (
              <BadgeChip tone="selected" className="challenge-card__selected-chip">
                ✓ Selected
              </BadgeChip>
            )}
            <BadgeChip
              tone="reward"
              className={`challenge-card__points-chip challenge-card__points-chip--${card.difficulty}`}
            >
              {pointsLabel}
            </BadgeChip>
          </div>
        </header>
      )}
      {!useIllustrativeHoleSetupMinimal && (
        <p className="challenge-card__description">{cardDescription}</p>
      )}
      {showMetadataLine &&
        (useIllustrativeHoleSetupMinimal ? metadataLineHoleSetupMinimal : metadataLine).length > 0 && (
          <p className="challenge-card__meta-line muted">
            {useIllustrativeHoleSetupMinimal ? metadataLineHoleSetupMinimal : metadataLine}
          </p>
        )}
      {!useIllustrativeHoleSetupMinimal && offerDetail && (
        <p className="muted challenge-card__offer-detail">{offerDetail}</p>
      )}
      {!useIllustrativeHoleSetupMinimal && showSupplementaryBadges && (
        <div className="challenge-card__badges">
          <BadgeChip
            tone="subtle"
            className={`challenge-card__type-chip challenge-card__type-chip--${card.cardType}`}
          >
            {getCardTypeLabel(card.cardType)}
          </BadgeChip>
          {offerKindLabel && (
            <BadgeChip
              tone={offerChipTone}
              className={`challenge-card__offer-chip challenge-card__offer-chip--${offerKind}`}
            >
              {offerKindLabel}
            </BadgeChip>
          )}
          <BadgeChip
            tone="subtle"
            className={`challenge-card__difficulty-chip challenge-card__difficulty-chip--${card.difficulty}`}
          >
            {toLabel(card.difficulty)}
          </BadgeChip>
        </div>
      )}
    </article>
  )
}

export default ChallengeCardView
