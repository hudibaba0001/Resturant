# 🔧 Stjarna Operations Runbook

## Emergency Procedures

### Rate Limiting Too Strict
**Symptoms**: High 429 error rates, users complaining about "try again later"

**Quick Fix**:
```bash
# Update rate limits in API routes
# Change from: 10 req/30s to 15 req/30s
# Keep burst at 3
# Redeploy API only (no frontend changes needed)
```

**Verification**:
```bash
# Test rate limit
for i in {1..20}; do
  curl -s -w "%{http_code}\n" https://your-domain.vercel.app/api/chat \
    -H 'Content-Type: application/json' \
    -d '{"restaurantId":"test","sessionToken":"test","message":"test"}'
done
# Should see mostly 200s, some 429s after 15 requests
```

### Menu Cache Stale
**Symptoms**: Menu items not updating, old prices showing

**Quick Fix**:
```bash
# Option 1: Bump cache duration temporarily
# In /api/public/menu/route.ts, change s-maxage from 60 to 10

# Option 2: Force cache invalidation
# Deploy with new ETag format or touch revalidate key
```

**Verification**:
```bash
# Check cache headers
curl -sI https://your-domain.vercel.app/api/public/menu?restaurantId=YOUR_ID
# Should see: Cache-Control: s-maxage=60, stale-while-revalidate=300
```

### Chat API Down
**Symptoms**: Widget shows fallback responses, no server chat

**Quick Fix**:
```bash
# Option 1: Check Supabase connection
curl -s https://your-domain.vercel.app/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"restaurantId":"test","sessionToken":"test","message":"test"}'

# Option 2: Enable client fallback
# Set environment variable: USE_SERVER_CHAT=false
# Widget will use local intelligent responses
```

### Widget Not Loading
**Symptoms**: FAB button missing, console errors

**Quick Fix**:
```bash
# Check widget bundle size
curl -s https://your-domain.vercel.app/widget.js | wc -c
# Should be <35KB

# Check for CORS issues
# Verify data-endpoint attribute matches your domain
```

## Monitoring Commands

### Health Check
```bash
# Overall system health
curl -s https://your-domain.vercel.app/api/health

# Menu API health
curl -sI https://your-domain.vercel.app/api/public/menu?restaurantId=YOUR_ID

# Chat API health
curl -s https://your-domain.vercel.app/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"restaurantId":"YOUR_ID","sessionToken":"health-check","message":"test"}'
```

### Log Analysis
```bash
# Vercel logs
vercel logs --follow

# Filter for errors
vercel logs | grep -i error

# Filter for rate limits
vercel logs | grep -i "429"

# Filter for specific tenant
vercel logs | grep "YOUR_RESTAURANT_ID"
```

### Performance Monitoring
```bash
# Check API response times
curl -w "@curl-format.txt" -s https://your-domain.vercel.app/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"restaurantId":"YOUR_ID","sessionToken":"test","message":"Italian dishes?"}'

# Create curl-format.txt:
#      time_namelookup:  %{time_namelookup}\n
#         time_connect:  %{time_connect}\n
#      time_appconnect:  %{time_appconnect}\n
#     time_pretransfer:  %{time_pretransfer}\n
#        time_redirect:  %{time_redirect}\n
#   time_starttransfer:  %{time_starttransfer}\n
#                      ----------\n
#           time_total:  %{time_total}\n
```

## Tenant Support

### "No Vegan Items Showing"
**Investigation**:
```sql
-- Check if items have vegan tags
SELECT name, allergens, tags 
FROM menu_items 
WHERE restaurant_id = 'TENANT_ID' 
  AND (allergens @> '["vegan"]' OR tags @> '["vegan"]');
```

**Response**: "The system only shows items explicitly marked as vegan in our database. We can help you add vegan tags to appropriate items."

### "Chat Not Working"
**Investigation**:
```bash
# Test their specific restaurant
curl -s https://your-domain.vercel.app/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"restaurantId":"THEIR_ID","sessionToken":"test","message":"test"}'
```

**Response**: "Let me check your specific setup. Can you try refreshing the page and testing again?"

### "Widget Not Loading"
**Investigation**:
```bash
# Check their domain in CORS allowlist
# Verify widget script URL is correct
# Check browser console for errors
```

**Response**: "Please check your browser's developer console (F12) and let me know if you see any error messages."

## Scaling Procedures

### High Traffic
**Symptoms**: Increased latency, timeouts

**Actions**:
1. **Immediate**: Increase rate limits temporarily
2. **Short-term**: Add more Vercel regions
3. **Long-term**: Implement caching layer

### Database Performance
**Symptoms**: Slow menu loads, chat timeouts

**Actions**:
1. **Check**: Supabase dashboard for connection limits
2. **Optimize**: Add database indexes
3. **Scale**: Upgrade Supabase plan if needed

## Security Incidents

### Suspicious Activity
**Symptoms**: Unusual request patterns, high error rates

**Actions**:
1. **Block**: IP addresses in Vercel
2. **Monitor**: Request patterns
3. **Investigate**: Log analysis

### Data Breach
**Symptoms**: Unauthorized access, data exposure

**Actions**:
1. **Immediate**: Rotate all API keys
2. **Investigate**: Audit logs
3. **Notify**: Affected tenants
4. **Report**: GDPR authorities if needed

## Deployment Procedures

### Hotfix Deployment
```bash
# Emergency fix
git commit -m "hotfix: rate limit adjustment"
git push origin main
vercel --prod

# Verify fix
curl -s https://your-domain.vercel.app/api/health
```

### Rollback
```bash
# Rollback to previous version
vercel rollback

# Verify rollback
curl -s https://your-domain.vercel.app/api/health
```

### Feature Flag Management
```bash
# Enable/disable server chat
vercel env add USE_SERVER_CHAT production false

# Update environment
vercel --prod
```

## Communication Templates

### Outage Notification
```
Subject: Stjarna Service Update

Hi [Tenant Name],

We're currently experiencing [issue description] that may affect your widget functionality. 

Impact: [What's affected]
ETA: [Expected resolution time]
Workaround: [If applicable]

We're actively working on a resolution and will update you as soon as it's resolved.

Best regards,
Stjarna Team
```

### Maintenance Notification
```
Subject: Scheduled Maintenance - Stjarna

Hi [Tenant Name],

We'll be performing scheduled maintenance on [date] from [time] to [time] UTC.

During this time, your widget may experience brief interruptions.

We apologize for any inconvenience and will notify you when maintenance is complete.

Best regards,
Stjarna Team
```

## Contact Information

### Internal Contacts
- **Tech Lead**: [Name] - [Phone] - [Email]
- **DevOps**: [Name] - [Phone] - [Email]
- **Product**: [Name] - [Phone] - [Email]

### External Contacts
- **Vercel Support**: https://vercel.com/support
- **Supabase Support**: https://supabase.com/support
- **Stripe Support**: https://stripe.com/support

### Escalation Path
1. **Level 1**: On-call engineer (immediate response)
2. **Level 2**: Tech lead (within 30 minutes)
3. **Level 3**: CTO (within 1 hour)

---

**Last Updated**: [Date]
**Version**: 1.0.0
**Next Review**: [Date + 1 month]
