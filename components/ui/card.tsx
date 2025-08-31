import React from 'react'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg'
}

export function Card({ 
  children, 
  className = '',
  padding = 'md' 
}: CardProps) {
  const paddingClasses = {
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6',
  }

  const classes = [
    'bg-surface',
    'border border-border',
    'rounded-card',
    'shadow-card',
    paddingClasses[padding],
    className,
  ].join(' ')

  return (
    <div className={classes}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

interface CardFooterProps {
  children: React.ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`mt-4 pt-4 border-t border-border ${className}`}>
      {children}
    </div>
  )
}

interface CardTitleProps {
  children: React.ReactNode
  className?: string
}

export function CardTitle({ children, className = '' }: CardTitleProps) {
  return (
    <h3 className={`text-lg font-semibold text-text ${className}`}>
      {children}
    </h3>
  )
}
