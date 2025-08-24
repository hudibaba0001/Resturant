# 🚀 Stjarna Launch Checklist

## Pre-Launch Verification

### Environment & Infrastructure
- [ ] **Vercel Production Deploy**
  - [ ] `NEXT_PUBLIC_SUPABASE_URL` = prod URL (no trailing slash)
  - [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = prod anon key
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` = prod service role
  - [ ] `STRIPE_SECRET_KEY` = prod key (if using payments)
  - [ ] `STRIPE_WEBHOOK_SECRET` = prod webhook secret

### Security & CORS
- [ ] **CORS Headers** (in API routes)
  - [ ] Allow-list pilot domains only
  - [ ] `Vary: Origin` header
  - [ ] Only `POST` + `Content-Type` methods
- [ ] **Security Headers** (next.config.js)
  - [ ] HSTS enabled
  - [ ] X-Frame-Options: SAMEORIGIN
  - [ ] X-Content-Type-Options: nosniff
  - [ ] Referrer-Policy: strict-origin-when-cross-origin
  - [ ] CSP with widget CDN in script-src

### Rate Limiting
- [ ] **API Rate Limits**
  - [ ] `/api/chat`: 10 req/30s per restaurantId + sessionToken, burst 3
  - [ ] `/api/public/menu`: 60 req/60s per IP
- [ ] **Error Responses**
  - [ ] 429: "Lots of requests—try again in a few seconds"
  - [ ] 500: "Couldn't fetch the menu—browse items on the left"

### Caching Strategy
- [ ] **Menu API**
  - [ ] `Cache-Control: s-maxage=60, stale-while-revalidate=300`
  - [ ] `ETag` header with restaurant ID
- [ ] **Chat API**
  - [ ] `Cache-Control: no-store`

### Widget Bundle
- [ ] **Size & Performance**
  - [ ] Bundle ≤35KB gzipped
  - [ ] No console warnings/errors
  - [ ] Event listeners attached once only
  - [ ] Delegated clicks only (no inline onclick)
- [ ] **Headers**
  - [ ] Sends `X-Widget-Version: 1.0.0`
  - [ ] Proper CORS preflight handling

### Accessibility
- [ ] **Cards & UI**
  - [ ] Cards have `role="group"` + `aria-labelledby`
  - [ ] Chips are `<button>` elements with readable labels
  - [ ] Inputs minimum 44px touch target
  - [ ] Focus trap in modal
  - [ ] ESC key closes modal
  - [ ] Screen reader friendly

### Privacy & GDPR
- [ ] **Data Protection**
  - [ ] No PII in server logs
  - [ ] Plausible analytics enabled
  - [ ] All data stays in EU (Supabase EU region)
  - [ ] DPA in place with Supabase
  - [ ] Session tokens are pseudonymous

### Payments (if enabled)
- [ ] **Stripe Configuration**
  - [ ] Production keys set
  - [ ] Webhook endpoint live
  - [ ] Retry logic enabled
  - [ ] Idempotency handling

## Smoke Tests

### Menu API Test
```bash
curl -sI https://your-domain.vercel.app/api/public/menu?restaurantId=YOUR_RESTAURANT_ID
# Expected: 200 OK, ETag header, Cache-Control: s-maxage=60
```

### Chat API Test (English)
```bash
curl -s https://your-domain.vercel.app/api/chat \
  -H 'Content-Type: application/json' \
  -H 'X-Widget-Version: 1.0.0' \
  -d '{"restaurantId":"YOUR_RESTAURANT_ID","sessionToken":"test","message":"Italian dishes?"}'
# Expected: {"reply":{"text":"...","chips":[...],"locale":"en"},"cards":[...]}
```

### Chat API Test (Swedish)
```bash
curl -s https://your-domain.vercel.app/api/chat \
  -H 'Content-Type: application/json' \
  -H 'X-Widget-Version: 1.0.0' \
  -d '{"restaurantId":"YOUR_RESTAURANT_ID","sessionToken":"test","message":"Har ni veganska alternativ?"}'
# Expected: {"reply":{"text":"...","locale":"sv"},"cards":[]} (if no vegan items)
```

## Monitoring Setup

### Dashboards
- [ ] **Plausible Analytics**
  - [ ] Widget opens tracking
  - [ ] Chip click tracking
  - [ ] Card CTR tracking
  - [ ] Add-to-cart CTR tracking
- [ ] **Log Monitoring**
  - [ ] API latency p50/p95
  - [ ] Error rate tracking
  - [ ] Rate limit hits
  - [ ] Top intent buckets
  - [ ] Per-tenant health metrics

### Alerts
- [ ] **Critical Alerts**
  - [ ] `/api/chat` error rate >2% (5m window) → page team
  - [ ] p95 latency >1200ms (10m window) → page team
  - [ ] Rate limit hits >5% of requests → investigate
- [ ] **Warning Alerts**
  - [ ] Widget load failures >1% (15m window)
  - [ ] Menu API errors >5% (10m window)

### Rollback Strategy
- [ ] **Versioned Widget**
  - [ ] Widget URL: `/widget/v1.js` (versioned)
  - [ ] Keep v0 live for 24h after v1 launch
  - [ ] Feature flag: `USE_SERVER_CHAT=true`
  - [ ] Can flip to client fallback if API issues

## Post-Launch (First 72h)

### Hour 1
- [ ] Monitor error rates
- [ ] Check widget loads on pilot sites
- [ ] Verify chat responses
- [ ] Confirm analytics firing

### Hour 6
- [ ] Review first user interactions
- [ ] Check rate limit effectiveness
- [ ] Monitor API performance
- [ ] Verify cart functionality

### Day 1
- [ ] Full day metrics review
- [ ] User feedback collection
- [ ] Performance optimization if needed
- [ ] Security scan results

### Day 3
- [ ] Week 1 forecast based on usage
- [ ] Scaling plan if needed
- [ ] Feature prioritization
- [ ] Documentation updates

## Emergency Contacts

- **Tech Lead**: [Your Name] - [Phone/Email]
- **DevOps**: [DevOps Contact] - [Phone/Email]
- **Product**: [Product Contact] - [Phone/Email]
- **Supabase Support**: [Support Ticket URL]
- **Vercel Support**: [Support Ticket URL]

## Quick Commands

```bash
# Check production status
curl -s https://your-domain.vercel.app/api/health

# Monitor logs
vercel logs --follow

# Rollback if needed
vercel rollback

# Purge cache
vercel deploy --force
```

---

**Last Updated**: [Date]
**Version**: 1.0.0
**Next Review**: [Date + 1 week]
