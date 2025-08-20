# 🚀 Go-Live Checklist - Dashboard v1

## ✅ **Pre-Deployment Verification**

### Environment Variables
- [ ] **Vercel Production**: All env vars set (not just Preview)
- [ ] **SUPABASE_SERVICE_ROLE_KEY**: Correct name (not `SUPABASE_SERVICE_ROLE`)
- [ ] **NEXT_PUBLIC_WIDGET_ORIGIN**: Exact origin, no trailing slash
- [ ] **EU Compliance**: Supabase EU, Vercel `fra1`, Sentry EU DSN

### Code Verification
- [ ] **Build Success**: `npm run build` passes
- [ ] **RLS Policies**: All tables have RLS enabled
- [ ] **Security Headers**: HSTS, XFO, XCTO, Referrer-Policy
- [ ] **CORS**: Widget origin restrictions in place
- [ ] **Health Endpoint**: `/api/health` returns `{ ok: true }`

## 🚀 **Deployment Steps**

### 1. Deploy to Production
```bash
# Push to main (triggers Vercel deployment)
git push origin main

# Verify deployment in Vercel dashboard
# Check: https://your-domain.vercel.app
```

### 2. Environment Verification
```bash
# Run environment check
./verify_env.sh

# Verify production env vars are set in Vercel
# Settings → Environment Variables → Production
```

### 3. Smoke Tests
```bash
# Update smoke_test.sh with your production URL and UUIDs
# Then run:
./smoke_test.sh
```

**Expected Results:**
- ✅ Health check: `{ "ok": true, "timestamp": "...", "version": "1.0.0" }`
- ✅ Security headers: All 4 headers present
- ✅ Public APIs: Status and menu return valid data
- ✅ Chat API: Returns AI response
- ✅ Orders API: Dine-in returns orderCode, pickup returns checkoutUrl
- ✅ Error handling: Invalid payload returns 400
- ✅ CORS: OPTIONS requests work

## 🔒 **Security Verification**

### 4. RLS Test (Supabase SQL Editor)
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

### 5. Sentry Test
```bash
# Trigger a controlled error
curl -s -X POST "https://your-domain.vercel.app/api/orders" \
  -H "Content-Type: application/json" \
  -d "{\"invalid\":\"payload\"}"
```
**Check**: Error appears in Sentry EU dashboard

## 💳 **Stripe Webhook Setup**

### 6. Webhook Configuration
1. **Stripe Dashboard** → Developers → Webhooks → **Add endpoint**
2. **URL**: `https://your-domain.vercel.app/api/stripe/webhook`
3. **Events**: `checkout.session.completed`, `checkout.session.expired`
4. **Copy webhook secret** → Set `STRIPE_WEBHOOK_SECRET` in Vercel Production
5. **Redeploy** to pick up new env var
6. **Send test event** → Verify 200 response and order status updates

## 📊 **Performance Verification**

### 7. Lighthouse Scores
```bash
# Homepage
npx lighthouse "https://your-domain.vercel.app" --only-categories=performance,accessibility,best-practices,seo --quiet

# Dashboard
npx lighthouse "https://your-domain.vercel.app/dashboard/menu" --only-categories=performance,accessibility,best-practices,seo --quiet
```
**Target**: ≥90 on all metrics (mobile)

## 🎯 **Widget Integration Test**

### 8. External Site Test
```html
<!-- Test on external page -->
<script src="https://your-domain.vercel.app/widget.js"></script>
<div id="stjarna-widget" data-restaurant-id="your-restaurant-uuid"></div>
```

**Verify**:
- Widget loads without errors
- Chat functionality works
- Menu displays correctly
- Order flow functions (dine-in code, pickup checkout)

## 📈 **Monitoring Setup**

### 9. Enable Monitoring
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

## 🔄 **Rollback Plan**

### Quick Rollback (2 minutes)
1. **Vercel**: Promote previous deployment in Deployments tab
2. **Database**: Use Supabase PITR if needed

### Monitoring Alerts
- **Sentry**: >10 errors / 5 min
- **Uptime**: `GET /api/health` every 1 min
- **Plausible**: Watch widget_open, checkout_start events

---

## 🚀 **Ready for Production!**

**Dashboard v1 is production-ready with:**
- ✅ Enterprise-grade security
- ✅ Performance optimizations
- ✅ Comprehensive monitoring
- ✅ EU compliance
- ✅ Stripe payment processing

**Next: Deploy to Vercel Production and run the smoke tests!**
