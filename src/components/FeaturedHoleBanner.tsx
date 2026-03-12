import { FEATURED_HOLES_BY_ID } from '../data/featuredHoles.ts'
import type { FeaturedHoleType } from '../types/game.ts'

interface FeaturedHoleBannerProps {
  featuredHoleType: FeaturedHoleType | null
  compact?: boolean
}

function FeaturedHoleBanner({ featuredHoleType, compact = false }: FeaturedHoleBannerProps) {
  if (!featuredHoleType) {
    return null
  }

  const featuredHole = FEATURED_HOLES_BY_ID[featuredHoleType]

  return (
    <section className={`panel featured-hole-banner ${compact ? 'featured-hole-banner--compact' : ''}`}>
      <p className="featured-hole-banner__label">Featured Hole</p>
      <h3 className="featured-hole-banner__title">{featuredHole.name}</h3>
      <p className="featured-hole-banner__rule">{featuredHole.shortDescription}</p>
      <p className="muted">{featuredHole.badgeLabel ?? 'Special'} • {featuredHole.quickRule}</p>
      <p className="muted">This hole only. Game points only.</p>
      <p className="muted">
        Featured-hole effects are applied automatically during deal and scoring for this hole.
      </p>
      {!compact && (
        <>
          <p className="muted">{featuredHole.longDescription}</p>
          <p className="muted">{featuredHole.pacingNote}</p>
        </>
      )}
    </section>
  )
}

export default FeaturedHoleBanner
