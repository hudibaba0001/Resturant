'use client';

import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface DropdownMenuProps {
  children: React.ReactNode;
}

interface DropdownMenuTriggerProps {
  asChild?: boolean;
  children: React.ReactNode;
  className?: string;
}

interface DropdownMenuContentProps {
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  className?: string;
}

interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export function DropdownMenu({ children }: DropdownMenuProps) {
  return <div className="relative inline-block">{children}</div>;
}

export function DropdownMenuTrigger({ asChild, children, className }: DropdownMenuTriggerProps) {
  return (
    <div className={cn("cursor-pointer", className)}>
      {children}
    </div>
  );
}

export function DropdownMenuContent({ children, align = 'end', className }: DropdownMenuContentProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contentRef.current && !contentRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  const handleTriggerClick = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 4,
        left: align === 'end' ? rect.right - 200 : rect.left, // Approximate width
      });
    }
    setIsOpen(!isOpen);
  };

  return (
    <>
      <div ref={triggerRef} onClick={handleTriggerClick}>
        {children}
      </div>
      {isOpen && (
        <div
          ref={contentRef}
          className={cn(
            "absolute z-50 min-w-[200px] rounded-md border bg-white p-1 shadow-md",
            className
          )}
          style={{
            top: position.top,
            left: position.left,
          }}
        >
          {children}
        </div>
      )}
    </>
  );
}

export function DropdownMenuItem({ children, onClick, className, disabled }: DropdownMenuItemProps) {
  return (
    <div
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </div>
  );
}
