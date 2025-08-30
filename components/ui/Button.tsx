import React from 'react'
import { tokens } from '@/lib/ui/tokens'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'destructive'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  children: React.ReactNode
  asChild?: boolean
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '',
  asChild = false,
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
    icon: 'h-8 w-8 p-0',
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
    outline: [
      'bg-transparent text-text',
      'border border-border',
      'hover:bg-surface-2',
      'focus:ring-accent',
    ],
    destructive: [
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

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      className: classes,
      ...props,
    });
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  )
}
