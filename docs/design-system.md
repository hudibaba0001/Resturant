# Stjarna MVP Design System

> Complete design system for the Stjarna restaurant widget platform, ensuring consistent, accessible, and performant UI across all components.

## Overview

The Stjarna MVP design system provides a comprehensive set of design tokens, components, and guidelines to build clean, accessible, and fast user interfaces. It's built on Tailwind CSS with custom design tokens that follow the UI/UX Playbook specifications.

## Design Principles

- **Fast first interaction** (<200ms TTI on modern phones)
- **Readable & calm**: minimal chrome, generous spacing, one accent color
- **Accessible by default**: keyboard, SR labels, focus rings, color contrast ≥ 4.5:1
- **Don't make me think**: primary action is always obvious; destructive actions need confirm
- **Never block the sale**: errors are inline, recoverable; show totals & prices clearly

## Design Tokens

### Colors

```typescript
// Background colors
bg: '#0B0D12'           // Widget overlay background
surface: '#0F131A'      // Primary surface color
surface-2: '#141A23'    // Secondary surface color
border: '#232B36'       // Border color

// Text colors
text: '#E7EEF7'         // Primary text
text-muted: '#A8B3C2'   // Muted text

// Accent colors
accent: '#2EE6A6'       // Primary accent (mint)
accent-blue: '#4DA3FF'  // Alternative accent (blue)

// Semantic colors
success: '#2EE6A6'      // Success states
warning: '#F6C34A'      // Warning states
danger: '#FF6B6B'       // Error/danger states
```

### Typography

```typescript
// Font family
fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Inter, Noto Sans, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"'

// Font sizes
xs: '12px'    // Extra small
sm: '14px'    // Small
base: '16px'  // Base
lg: '18px'    // Large
xl: '20px'    // Extra large
2xl: '24px'   // 2X large
3xl: '32px'   // 3X large

// Line heights
body: '1.4'   // Body text
heading: '1.2' // Headings
```

### Spacing

```typescript
// Spacing scale (px)
2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48
```

### Border Radius

```typescript
button: '9999px'  // Pill shape for buttons
input: '12px'     // Input fields
card: '16px'      // Cards and containers
modal: '20px'     // Modal dialogs
```

### Shadows

```typescript
card: '0 6px 24px rgba(0,0,0,.25)'   // Card shadows
modal: '0 12px 32px rgba(0,0,0,.35)' // Modal shadows
```

### Motion

```typescript
duration: {
  fast: '150ms',
  normal: '250ms',
}

easing: {
  smooth: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
}
```

## Components

### Button

```tsx
import { Button } from '@/components/ui'

// Variants
<Button variant="primary">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="danger">Danger</Button>

// Sizes
<Button size="sm">Small</Button>
<Button size="md">Medium</Button>
<Button size="lg">Large</Button>

// States
<Button disabled>Disabled</Button>
```

### Card

```tsx
import { Card, CardHeader, CardContent, CardFooter } from '@/components/ui'

<Card>
  <CardHeader>
    <h2>Card Title</h2>
  </CardHeader>
  <CardContent>
    <p>Card content goes here</p>
  </CardContent>
  <CardFooter>
    <Button>Action</Button>
  </CardFooter>
</Card>
```

### Badge

```tsx
import { Badge } from '@/components/ui'

// Variants
<Badge variant="default">Default</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="danger">Danger</Badge>

// Sizes
<Badge size="sm">Small</Badge>
<Badge size="md">Medium</Badge>
```

### Input

```tsx
import { Input } from '@/components/ui'

<Input 
  label="Email Address"
  placeholder="Enter your email"
  type="email"
  helperText="We'll never share your email"
/>

<Input 
  label="Password"
  placeholder="Enter your password"
  type="password"
  error="Password is required"
/>
```

## Usage Guidelines

### Accessibility

- All interactive elements must have visible focus rings
- Use proper ARIA labels for screen readers
- Maintain color contrast ratios (≥ 4.5:1 for body text, ≥ 3:1 for large text)
- Ensure hit targets are ≥ 44×44px on mobile

### Performance

- Widget JS ≤ 35KB gzipped
- Dashboard page first load ≤ 150KB gzipped (excluding fonts)
- Use skeletons for loading states
- Avoid layout shift (CLS ≈ 0)

### Responsive Design

- Mobile-first approach
- Test at 360×640, 768×1024, 1280×800 viewports
- No horizontal scrollbars
- Cards wrap cleanly

### Copy Guidelines

- Plain, friendly copy; no lorem ipsum
- Prices always include currency (e.g., `SEK 119.00`)
- Empty states suggest next actions (e.g., "Try 'vegan' or 'gluten-free'")
- Error messages are inline and recoverable

## Implementation

### Tailwind Configuration

The design tokens are implemented in `tailwind.config.ts` and can be used directly in Tailwind classes:

```tsx
<div className="bg-surface text-text p-4 rounded-card shadow-card">
  <h2 className="text-2xl font-semibold">Title</h2>
  <p className="text-text-muted">Description</p>
</div>
```

### JavaScript Usage

For dynamic styling, import tokens from `@/lib/ui/tokens`:

```tsx
import { tokens, getColor, getSpacing } from '@/lib/ui/tokens'

const style = {
  backgroundColor: getColor('surface'),
  padding: getSpacing(16),
  borderRadius: tokens.borderRadius.card,
}
```

### Component Library

All components are available from `@/components/ui`:

```tsx
import { Button, Card, Badge, Input } from '@/components/ui'
```

## Design System Demo

Visit `/design-system` to see all design tokens and components in action.

## Quality Assurance

Use the [UI/UX PR Checklist](../docs/ui-ux-pr-checklist.md) for all UI changes to ensure:

- Accessibility compliance
- Performance standards
- Responsive design
- Visual consistency
- Proper copy and formatting

## Future Enhancements

- Theme switching (light/dark mode)
- Custom accent color support via data attributes
- Additional component variants
- Animation library
- Icon system
