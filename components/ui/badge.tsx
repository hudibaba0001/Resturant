import React from 'react'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ 
  children, 
  variant = 'default',
  size = 'sm',
  className = '' 
}: BadgeProps) {
  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-medium uppercase tracking-wide',
    'rounded-button',
  ]

  const sizeClasses = {
    sm: 'h-6 px-2 text-xs',
    md: 'h-8 px-3 text-sm',
  }

  const variantClasses = {
    default: [
      'bg-surface-2 text-text-muted',
      'border border-border',
    ],
    success: [
      'bg-success/20 text-success',
      'border border-success/30',
    ],
    warning: [
      'bg-warning/20 text-warning',
      'border border-warning/30',
    ],
    danger: [
      'bg-danger/20 text-danger',
      'border border-danger/30',
    ],
  }

  const classes = [
    ...baseClasses,
    sizeClasses[size],
    ...variantClasses[variant],
    className,
  ].join(' ')

  return (
    <span className={classes}>
      {children}
    </span>
  )
}
