import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface IconProps extends React.HTMLAttributes<HTMLDivElement> {
  icon: LucideIcon
  size?: 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'default' | 'muted' | 'primary' | 'success' | 'warning' | 'danger'
}

const sizeMap = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
}

const variantMap = {
  default: 'text-gray-600 dark:text-gray-400',
  muted: 'text-gray-400 dark:text-gray-500',
  primary: 'text-primary-600 dark:text-primary-400',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-yellow-600 dark:text-yellow-400',
  danger: 'text-red-600 dark:text-red-400',
}

export function Icon({ 
  icon: Icon,
  size = 'md',
  variant = 'default',
  className,
  ...props 
}: IconProps) {
  return (
    <div 
      className={cn(
        "inline-flex items-center justify-center",
        sizeMap[size],
        variantMap[variant],
        className
      )}
      {...props}
    >
      <Icon className="h-full w-full" />
    </div>
  )
}
