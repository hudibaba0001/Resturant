import React from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export function Input({ 
  label, 
  error, 
  helperText,
  className = '',
  id,
  ...props 
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
  
  const inputClasses = [
    'w-full',
    'h-10',
    'px-3',
    'bg-surface',
    'border border-border',
    'rounded-input',
    'text-text',
    'placeholder:text-text-muted',
    'focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent',
    'transition-all duration-150 ease-smooth',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    error && 'border-danger focus:ring-danger',
    className,
  ].filter(Boolean).join(' ')

  return (
    <div className="space-y-2">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm font-medium text-text"
        >
          {label}
        </label>
      )}
      
      <input
        id={inputId}
        className={inputClasses}
        {...props}
      />
      
      {error && (
        <p className="text-sm text-danger">
          {error}
        </p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-text-muted">
          {helperText}
        </p>
      )}
    </div>
  )
}
