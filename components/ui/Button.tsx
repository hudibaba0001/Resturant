import React from 'react'
import { tokens } from '@/lib/ui/tokens'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '',
  ...props 
}: ButtonProps) {
  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-medium transition-all duration-250 ease-smooth',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ]

  const sizeClasses = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-10 px-4 text-base',
    lg: 'h-12 px-6 text-lg',
  }

  const variantClasses = {
    primary: [
      'bg-accent text-white',
      'hover:bg-accent/90',
      'focus:ring-accent',
      'shadow-sm',
    ],
    secondary: [
      'bg-surface-2 text-text',
      'border border-border',
      'hover:bg-surface',
      'focus:ring-accent',
    ],
    ghost: [
      'bg-transparent text-text-muted',
      'hover:bg-surface-2 hover:text-text',
      'focus:ring-accent',
    ],
    danger: [
      'bg-danger text-white',
      'hover:bg-danger/90',
      'focus:ring-danger',
    ],
  }

  const classes = [
    ...baseClasses,
    sizeClasses[size],
    ...variantClasses[variant],
    'rounded-button',
    className,
  ].join(' ')

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
