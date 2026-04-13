interface SegmentedControlOption {
  id: string
  label: string
}

interface SegmentedControlProps {
  ariaLabel: string
  options: readonly SegmentedControlOption[]
  selectedId: string
  onSelect: (id: string) => void
  className?: string
}

function SegmentedControl({
  ariaLabel,
  options,
  selectedId,
  onSelect,
  className = 'segmented-control',
}: SegmentedControlProps) {
  return (
    <div className={className} role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          className={`segmented-control__button ${
            selectedId === option.id ? 'segmented-control__button--active' : ''
          }`}
          onClick={() => onSelect(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

export default SegmentedControl
