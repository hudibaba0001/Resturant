# 🚀 Stjarna Deployment Bundle

## Production Deployment Checklist

### 1. Environment Variables (Vercel)
```bash
# Required for production
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NODE_ENV=production
```

### 2. Pre-Deployment Tests
```bash
# Build test
npm run build

# Health check
curl https://your-domain.vercel.app/api/health

# Menu API test
curl -sI "https://your-domain.vercel.app/api/public/menu?restaurantId=64806e5b-714f-4388-a092-29feff9b64c0"

# Chat API test
curl -s https://your-domain.vercel.app/api/chat \
  -H 'Content-Type: application/json' \
  -H 'X-Widget-Version: 1.0.0' \
  -d '{"restaurantId":"64806e5b-714f-4388-a092-29feff9b64c0","sessionToken":"test","message":"Italian dishes?"}'
```

### 3. Widget Embed Code (for clients)
```html
<!-- Production widget embed -->
<script
  src="https://your-domain.vercel.app/widget.js"
  data-restaurant="64806e5b-714f-4388-a092-29feff9b64c0"
  defer
></script>
```

### 4. Monitoring Setup
```bash
# Plausible Analytics (add to client sites)
<script defer data-domain="your-domain.com" src="https://plausible.io/js/script.js"></script>

# Health check monitoring (every 5 minutes)
curl -f https://your-domain.vercel.app/api/health || echo "Health check failed"
```

## File Structure for Deployment
```
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # ✅ Chat API with rate limiting
│   │   ├── health/route.ts        # ✅ Health monitoring
│   │   └── public/menu/route.ts   # ✅ Menu API with caching
│   └── ...
├── public/
│   └── widget.js                  # ✅ Production widget (35KB gz)
├── next.config.js                 # ✅ Security headers
├── LAUNCH_CHECKLIST.md            # ✅ Deployment checklist
├── OPS_RUNBOOK.md                 # ✅ Operations guide
└── DEPLOYMENT_BUNDLE.md           # ✅ This file
```

## Post-Deployment Verification

### 1. Security Headers Check
```bash
curl -I https://your-domain.vercel.app/api/chat
# Should return:
# X-Frame-Options: SAMEORIGIN
# X-Content-Type-Options: nosniff
# Referrer-Policy: strict-origin-when-cross-origin
```

### 2. CORS Test
```bash
# Test from different origin
curl -H "Origin: https://client-site.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -X OPTIONS https://your-domain.vercel.app/api/chat
```

### 3. Rate Limiting Test
```bash
# Should get 429 after 10 requests
for i in {1..15}; do
  curl -s -w "%{http_code}\n" https://your-domain.vercel.app/api/chat \
    -H 'Content-Type: application/json' \
    -d '{"restaurantId":"test","sessionToken":"test","message":"test"}'
done
```

## Rollback Plan
```bash
# If issues arise, rollback to previous version
git checkout HEAD~1
git push origin main

# Or use Vercel rollback
vercel --prod --rollback
```

## Emergency Contacts
- **Database Issues**: Check Supabase dashboard
- **API Issues**: Check Vercel function logs
- **Widget Issues**: Check browser console on client sites
- **Rate Limiting**: Adjust limits in `/api/chat/route.ts`
