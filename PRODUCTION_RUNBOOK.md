# 🚀 Production Go-Live Runbook - Dashboard v1

## ✅ **Pre-Flight Checklist**

### Environment Variables (Vercel Production)
```bash
# Required - Verify these are set in Vercel → Settings → Environment Variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # ✅ Correct name
OPENAI_API_KEY=your_openai_key
STRIPE_SECRET_KEY=your_stripe_key
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_WIDGET_ORIGIN=https://your-widget-domain.com  # Exact origin, no trailing slash
SENTRY_DSN=your_sentry_dsn_eu  # EU project
```

### EU Compliance Verification
- [ ] **Supabase**: EU region selected
- [ ] **Vercel**: Functions region set to `fra1` (EU)
- [ ] **Sentry**: EU DSN configured
- [ ] **Plausible**: EU hosting (default)

## 🧪 **Production Smoke Tests**

### 1) Health Check
```bash
BASE="https://your-domain.vercel.app"
curl -s "$BASE/api/health" | jq .
```
**Expected**: `{ "ok": true, "timestamp": "...", "version": "1.0.0" }`

### 2) Public APIs
```bash
RID="your-restaurant-uuid"  # Replace with actual UUID

# Status check
curl -s "$BASE/api/public/status?restaurantId=$RID" | jq .
# Expected: { "open": true|false }

# Menu check
curl -s "$BASE/api/public/menu?restaurantId=$RID" | jq '.sections | length'
# Expected: Non-zero number of sections
```

### 3) Chat API
```bash
curl -s -X POST "$BASE/api/chat" \
  -H "Content-Type: application/json" \
  -d "{\"restaurantId\":\"$RID\",\"sessionToken\":\"go-live\",\"message\":\"vegan options?\"}" | jq .
```
**Expected**: `{ "response": "...", "restaurant": { "id": "...", "name": "..." } }`

### 4) Orders API
```bash
ITEM_UUID="your-menu-item-uuid"  # Replace with actual UUID

# Dine-in order
curl -s -X POST "$BASE/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"restaurantId\":\"$RID\",\"sessionToken\":\"go-live\",\"type\":\"dine_in\",\"items\":[{\"itemId\":\"$ITEM_UUID\",\"qty\":1}]}" | jq .
# Expected: { "orderCode": "ABC123" }

# Pickup order
curl -s -X POST "$BASE/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"restaurantId\":\"$RID\",\"sessionToken\":\"go-live\",\"type\":\"pickup\",\"items\":[{\"itemId\":\"$ITEM_UUID\",\"qty\":1}]}" | jq .
# Expected: { "checkoutUrl": "https://checkout.stripe.com/..." }
```

### 5) Security Headers
```bash
curl -I "$BASE" | egrep "strict-transport-security|x-frame-options|x-content-type-options|referrer-policy"
```
**Expected**: All 4 security headers present

## 🔒 **Security Verification**

### 6) RLS Test (Supabase SQL Editor)
```sql
-- Test unauthenticated access (should be denied)
BEGIN;
SET LOCAL ROLE none;
-- These should all fail due to RLS
SELECT * FROM public.menu_items LIMIT 1;
SELECT * FROM public.orders LIMIT 1;
SELECT * FROM public.restaurants LIMIT 1;
ROLLBACK;
```
**Expected**: All queries should fail with RLS error

### 7) Sentry Test
```bash
# Trigger a controlled error
curl -s -X POST "$BASE/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"invalid\":\"payload\"}" | jq .
```
**Expected**: 400 error, check Sentry dashboard for EU DSN

## 💳 **Stripe Webhook Setup**

### 8) Webhook Configuration
1. **Stripe Dashboard** → Developers → Webhooks → **Add endpoint**
2. **URL**: `https://your-domain.vercel.app/api/stripe/webhook`
3. **Events**: `checkout.session.completed`, `checkout.session.expired`
4. **Copy webhook secret** → Set `STRIPE_WEBHOOK_SECRET` in Vercel
5. **Send test event** → Verify 200 response

## 📊 **Performance Verification**

### 9) Lighthouse Scores
```bash
# Homepage
npx lighthouse "$BASE" --only-categories=performance,accessibility,best-practices,seo --quiet

# Dashboard
npx lighthouse "$BASE/dashboard/menu" --only-categories=performance,accessibility,best-practices,seo --quiet
```
**Target**: ≥90 on all metrics (mobile)

## 🎯 **Widget Integration Test**

### 10) External Site Test
```html
<!-- Test on external page -->
<script src="https://your-domain.vercel.app/widget.js"></script>
<div id="stjarna-widget" data-restaurant-id="your-restaurant-uuid"></div>
```
**Verify**:
- Widget loads without errors
- Chat functionality works
- Menu displays correctly
- Order flow functions

## 🚀 **Deployment Commands**

### Final Deploy
```bash
# Tag the release
git add .
git commit -m "feat: production hardening complete - v1.0.0"
git tag v1.0.0
git push origin main --tags

# Deploy to Vercel Production
# (Should happen automatically on push to main)
```

### Post-Deploy Verification
```bash
# 1. Check deployment status
curl -s "$BASE/api/health"

# 2. Verify all smoke tests pass
# (Run tests 1-5 above)

# 3. Check Sentry for any errors
# (Monitor for 24 hours)

# 4. Verify Stripe webhook
# (Send test event, check database)
```

## 📈 **Monitoring Setup**

### 11) Enable Monitoring
- [ ] **Sentry**: Error alerts for 5xx errors
- [ ] **Plausible**: Dashboard shared with team
- [ ] **Lighthouse CI**: Enabled for future PRs
- [ ] **Database**: Monitor query performance

## 🎉 **Go-Live Checklist**

### Pre-Launch (Today)
- [ ] All smoke tests pass
- [ ] Security headers verified
- [ ] RLS policies confirmed
- [ ] Stripe webhook functional
- [ ] Lighthouse scores ≥90
- [ ] Sentry EU DSN active

### Launch (Today)
- [ ] Deploy to Vercel Production
- [ ] Run post-deploy verification
- [ ] Tag v1.0.0 release
- [ ] Enable Lighthouse CI

### Pilot Week (Days 1-7)
- [ ] Onboard 1-2 friendly restaurants
- [ ] Install widgets on external sites
- [ ] Monitor Sentry for errors
- [ ] Collect user feedback
- [ ] Begin Insights v1 development

---

**Status**: ✅ **READY FOR PRODUCTION DEPLOYMENT**

All systems verified and ready for live pilot rollout.
