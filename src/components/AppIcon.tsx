import type { AppIconName } from '../app/icons.ts'

interface AppIconProps {
  icon: AppIconName
  className?: string
}

function AppIcon({ icon, className }: AppIconProps) {
  return (
    <span className={className ? `app-icon ${className}` : 'app-icon'} aria-hidden="true">
      {icon}
    </span>
  )
}

export default AppIcon
