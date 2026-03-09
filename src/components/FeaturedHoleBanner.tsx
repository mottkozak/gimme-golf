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
      <div className="row-between">
        <p className="featured-hole-banner__label">Featured Hole</p>
        <div className="button-row">
          <span className="chip featured-hole-banner__chip">{featuredHole.badgeLabel ?? 'Special'}</span>
          <span className="chip featured-hole-banner__chip">{featuredHole.quickRule}</span>
        </div>
      </div>
      <h3 className="featured-hole-banner__title">{featuredHole.name}</h3>
      <p className="featured-hole-banner__rule">{featuredHole.shortDescription}</p>
      <div className="featured-hole-banner__meta">
        <span className="chip">This hole only</span>
        <span className="chip">Game points only</span>
      </div>
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
