# UI/UX PR Checklist

## 🎨 Visual Design

- [ ] Widget maintains consistent design tokens (colors, spacing, typography)
- [ ] Mobile layout works on all screen sizes (320px+)
- [ ] Dark/light theme compatibility (if applicable)
- [ ] Loading states are clear and informative
- [ ] Error states provide helpful feedback

## ♿ Accessibility

- [ ] All interactive elements have proper ARIA labels
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Focus indicators are visible and clear
- [ ] Screen reader compatibility tested
- [ ] Color contrast meets WCAG AA standards
- [ ] No reliance on color alone for information

## 📱 Mobile Experience

- [ ] Touch targets are at least 44px × 44px
- [ ] No horizontal scrolling on mobile
- [ ] Modal opens/closes smoothly on mobile
- [ ] Chat input is easily accessible
- [ ] Cart interactions work on touch devices

## 🧠 User Experience

- [ ] Widget loads quickly (< 2 seconds)
- [ ] Chat responses are concise and helpful
- [ ] Error messages are user-friendly
- [ ] Success states provide clear feedback
- [ ] Closed state is clearly communicated
- [ ] Cart state persists across page reloads

## 🔧 Technical UX

- [ ] No console errors in browser
- [ ] API calls have proper error handling
- [ ] Rate limiting doesn't break user flow
- [ ] Session tokens work correctly
- [ ] Widget works in iframe context

## 🧪 Testing Checklist

- [ ] Tested on Chrome, Firefox, Safari, Edge
- [ ] Tested on iOS Safari and Android Chrome
- [ ] Tested with different restaurant menus
- [ ] Tested closed/open restaurant states
- [ ] Tested chat with various queries
- [ ] Tested cart add/remove functionality
- [ ] Tested checkout flow (dine-in and pickup)

## 🚀 Performance

- [ ] Widget bundle size is reasonable (< 50KB gzipped)
- [ ] No memory leaks in long sessions
- [ ] API calls are optimized and cached
- [ ] Images are properly optimized
- [ ] No unnecessary re-renders

## 📋 Final Checks

- [ ] All checklist items completed
- [ ] Screenshots/videos attached if UI changes
- [ ] Tested on actual restaurant website
- [ ] No regressions in existing functionality
