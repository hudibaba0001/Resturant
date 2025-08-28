# 🚨 On-Call Runbook: Order Status Management System

## 📊 **SLIs / SLOs**

- **API Success Rate**: ≥ 99.9% (2xx/3xx responses)
- **PATCH `/status` Latency**: p95 ≤ 300ms
- **Conflict Rate**: ≤ 2% (409 / all PATCH requests)
- **RLS Denial Rate**: ≤ 0.5% (403 / all PATCH requests)

## 🚨 **Alert Scenarios & Response**

### **1. 409 Conflict Spikes**
**Symptoms**: High rate of `order-status-conflict` messages in Sentry
**Threshold**: > 2% sustained conflict rate

**Investigation**:
```bash
# Check Sentry for conflict patterns
# Look for: order-status-conflict messages
# Check if specific orders/restaurants are affected
```

**Common Causes**:
- Staff hammering same order (UI issue)
- Multiple staff working same order simultaneously
- Network latency causing race conditions

**Response**:
1. **Immediate**: Check if specific restaurant/order affected
2. **Short-term**: Review UI affordances, add loading states
3. **Long-term**: Consider optimistic UI improvements

**Resolution**:
- Conflicts are **expected behavior** - system working correctly
- Focus on UX improvements if rate is high

---

### **2. 403/404 Uptick**
**Symptoms**: High rate of `order-status-forbidden` messages
**Threshold**: > 0.5% sustained denial rate

**Investigation**:
```bash
# Check Sentry for forbidden patterns
# Look for: order-status-forbidden messages
# Check Supabase auth health
```

**Common Causes**:
- Supabase auth service issues
- Cookie refresh problems
- RLS policy misconfiguration
- Recent deployment with auth changes

**Response**:
1. **Immediate**: Check Supabase status page
2. **Short-term**: Verify auth cookies are working
3. **Long-term**: Review RLS policies

**Resolution**:
- Check Supabase dashboard for auth service status
- Verify `SUPABASE_ANON_KEY` is correct
- Test auth flow manually

---

### **3. 500 Internal Server Errors**
**Symptoms**: Unhandled exceptions in `/status` routes
**Threshold**: Any 500s are critical

**Investigation**:
```bash
# Check Sentry for stack traces
# Look for: order-status-exception errors
# Check Vercel logs for request IDs
```

**Common Causes**:
- Database connection issues
- Environment variable problems
- Code bugs in recent deployment

**Response**:
1. **Immediate**: Check Sentry for stack traces
2. **Short-term**: Roll back last deployment if needed
3. **Long-term**: Add better error handling

**Resolution**:
- Look at Sentry stack traces
- Check environment variables
- Consider rollback if recent deployment

---

### **4. Slow p95 Latency**
**Symptoms**: PATCH `/status` taking > 300ms
**Threshold**: p95 > 300ms sustained

**Investigation**:
```bash
# Check Sentry performance data
# Look for: order-status-success with high duration_ms
# Check Supabase region latency
```

**Common Causes**:
- Supabase region latency
- Database load/contention
- Missing indexes
- Network issues

**Response**:
1. **Immediate**: Check Supabase status
2. **Short-term**: Verify database indexes
3. **Long-term**: Consider database optimization

**Resolution**:
- Check Supabase dashboard for performance
- Verify `orders_status_created_idx` index exists
- Consider database connection pooling

---

## 🔍 **Investigation Commands**

### **Sentry Queries**
```bash
# Recent conflicts
# Search: "order-status-conflict" in last 1h

# Recent errors
# Search: "order-status-exception" in last 1h

# Performance issues
# Search: "order-status-success" with duration_ms > 300
```

### **Database Queries**
```sql
-- Conflicts in last 24h
SELECT count(*) AS conflicts_24h
FROM public.widget_events
WHERE type='order_status_conflict' 
  AND created_at > now() - interval '24 hours';

-- Status changes per restaurant (7d)
SELECT restaurant_id, count(*) AS changes_7d
FROM public.order_status_events
WHERE created_at > now() - interval '7 days'
GROUP BY restaurant_id
ORDER BY changes_7d DESC;

-- Recent performance
SELECT 
  AVG(EXTRACT(EPOCH FROM (created_at - LAG(created_at) OVER (ORDER BY created_at)))) as avg_interval_seconds
FROM public.order_status_events 
WHERE created_at > now() - interval '1 hour';
```

### **Vercel Logs**
```bash
# Search for request IDs from Sentry
# Look for: "rid" in JSON logs

# Performance issues
# Search for: "duration_ms" > 300

# Error patterns
# Search for: "evt": "order_status_exception"
```

---

## 🛠️ **Quick Fixes**

### **Auth Issues**
```bash
# Check environment variables
echo $SENTRY_DSN
echo $SUPABASE_ANON_KEY

# Test Supabase connection
curl -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/orders?select=count"
```

### **Database Issues**
```sql
-- Check if indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename = 'order_status_events';

-- Check table sizes
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename IN ('order_status_events', 'orders');
```

### **Performance Issues**
```sql
-- Check for slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements 
WHERE query LIKE '%order_status_events%'
ORDER BY mean_time DESC;
```

---

## 📞 **Escalation Path**

### **Level 1 (On-Call)**
- Monitor Sentry alerts
- Check basic system health
- Apply quick fixes

### **Level 2 (Senior Engineer)**
- Deep dive into Sentry traces
- Database performance analysis
- Code review for recent changes

### **Level 3 (Architect)**
- System design review
- Infrastructure changes
- Long-term optimization

---

## 📋 **Post-Incident Checklist**

### **Immediate (0-1 hour)**
- [ ] Acknowledge alert
- [ ] Check Sentry for error patterns
- [ ] Verify system is responding
- [ ] Apply quick fixes if needed

### **Short-term (1-4 hours)**
- [ ] Investigate root cause
- [ ] Check recent deployments
- [ ] Monitor system recovery
- [ ] Update stakeholders

### **Long-term (1-7 days)**
- [ ] Write incident report
- [ ] Implement preventive measures
- [ ] Update runbook
- [ ] Schedule post-mortem

---

## 🔗 **Useful Links**

- **Sentry Dashboard**: [EU Project]
- **Supabase Dashboard**: [Project Settings]
- **Vercel Dashboard**: [Function Logs]
- **Plausible Analytics**: [Order Status Events]

---

## 📞 **Contacts**

- **Primary On-Call**: [Contact Info]
- **Secondary On-Call**: [Contact Info]
- **Engineering Lead**: [Contact Info]
- **DevOps**: [Contact Info]

---

**Remember**: Most issues are expected behavior (conflicts) or temporary (auth issues). Focus on user impact and system stability.
