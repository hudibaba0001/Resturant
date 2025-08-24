# Widget Core Testing Guide

This guide provides comprehensive testing strategies for the widget core functionality, ensuring everything works correctly before production deployment.

## 🚨 Critical Fix Applied

**RLS Policy Header Handling**: Fixed the unsafe JSON casting in RLS policies to prevent errors when headers are NULL:

```sql
-- BAD (can throw if setting is NULL):
-- coalesce(current_setting('request.headers', true), '')::json->>'origin'

-- GOOD (safe when setting is NULL):
coalesce((current_setting('request.headers', true))::json->>'origin','')
```

## 📋 Testing Checklist

### 1. Database Schema & Functions ✅
- [ ] Run `scripts/fix_widget_core.sql` in Supabase SQL Editor
- [ ] Run `scripts/test_widget_core.sql` to verify everything works
- [ ] Check all functions exist: `restaurant_open_now`, `slugify`, `origin_allowed`
- [ ] Verify all tables exist with correct columns
- [ ] Confirm indexes are created for performance
- [ ] Validate RLS policies are in place

### 2. Database Contract Tests ✅
- [ ] Run `npm run test:db` to test with different roles
- [ ] Verify anon users can create sessions/events with allowed origins
- [ ] Confirm anon users are blocked from cache tables
- [ ] Test service role can access cache tables
- [ ] Validate origin validation works correctly

### 3. API Endpoint Tests ✅
- [ ] Start your development server: `npm run dev`
- [ ] Run `scripts/test-api-endpoints.ps1` (Windows) or `scripts/test-api-endpoints.sh` (Linux/Mac)
- [ ] Test `/api/public/status` endpoint
- [ ] Test `/api/public/session` endpoint
- [ ] Test `/api/public/events` endpoint
- [ ] Verify error handling for invalid inputs

### 4. Widget Integration Tests ✅
- [ ] Visit your demo page: `https://your-vercel-url.vercel.app/widget-demo`
- [ ] Open browser dev tools and check for errors
- [ ] Test widget chat functionality
- [ ] Verify events are being logged
- [ ] Check session creation works

## 🧪 Running the Tests

### Step 1: Database Setup
```bash
# Apply the fixed migration
# Run this in Supabase SQL Editor:
scripts/fix_widget_core.sql

# Then run the comprehensive test:
scripts/test_widget_core.sql
```

### Step 2: Contract Tests
```bash
# Make sure your .env.local has the correct values
npm run test:db
```

### Step 3: API Tests
```bash
# Start your dev server
npm run dev

# In another terminal, run the API tests
# Windows:
.\scripts\test-api-endpoints.ps1

# Linux/Mac:
./scripts/test-api-endpoints.sh
```

### Step 4: Manual Widget Testing
1. Visit your demo page
2. Open browser dev tools (F12)
3. Check the Console tab for errors
4. Test the chat functionality
5. Verify the widget loads correctly

## 🔍 What Each Test Validates

### SQL Tests (`test_widget_core.sql`)
- **Functions**: All helper functions exist and work
- **Tables**: All widget tables exist with correct schemas
- **Indexes**: Performance indexes are in place
- **RLS Policies**: Security policies are configured
- **Data Integrity**: Foreign key relationships work
- **Policy Simulation**: Tests RLS with fake JWT/headers

### Contract Tests (`test:db`)
- **Role-based Access**: Anon vs service role permissions
- **Origin Validation**: Allowed vs disallowed origins
- **Function Calls**: RPC functions work correctly
- **Performance**: Indexed queries are fast
- **Error Handling**: Proper error responses

### API Tests (`test-api-endpoints`)
- **Status Endpoint**: Restaurant open/closed status
- **Session Endpoint**: Session creation and updates
- **Events Endpoint**: Event logging functionality
- **Validation**: Required field validation
- **Error Handling**: Proper HTTP status codes

## 🐛 Troubleshooting

### Common Issues

**1. RLS Policy Errors**
```
ERROR: invalid input syntax for type json
```
- **Solution**: Make sure you ran the fixed `fix_widget_core.sql` script

**2. Function Not Found**
```
ERROR: function restaurant_open_now(uuid) does not exist
```
- **Solution**: Run the migration script again in Supabase SQL Editor

**3. Missing Columns**
```
ERROR: column "session_id" does not exist
```
- **Solution**: The script should handle this automatically, but you can run it again

**4. API 500 Errors**
```
Internal Server Error
```
- **Solution**: Check your environment variables in `.env.local`

### Environment Variables Required
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key
RESTAURANT_ID=your_restaurant_uuid  # Optional, has default
```

## 📊 Expected Results

### SQL Tests
- All functions should show "WORKING"
- All tables should show "EXISTS"
- All indexes should show "EXISTS"
- All policies should show "EXISTS"
- RLS simulation should show success messages

### Contract Tests
- 10 tests should pass
- Success rate: 100%
- No errors in console

### API Tests
- Status endpoint: 200 OK with `{"open": true/false}`
- Session endpoint: 200 OK with session data
- Events endpoint: 200 OK with event ID
- Invalid requests: 400 Bad Request
- Disallowed origins: 403 Forbidden

## 🎯 Success Criteria

✅ **All SQL tests pass** - Database schema is correct  
✅ **All contract tests pass** - RLS and permissions work  
✅ **All API tests pass** - Endpoints function correctly  
✅ **Widget loads without errors** - Integration works  
✅ **No console errors** - Clean execution  

## 🚀 Next Steps After Testing

1. **Deploy to Production**: Push your changes to Vercel
2. **Monitor Logs**: Watch for any errors in production
3. **Test Real Widget**: Embed on a real website
4. **Performance Monitor**: Check query performance
5. **Security Audit**: Verify RLS is working in production

## 📞 Getting Help

If any tests fail:
1. Check the error message carefully
2. Verify your environment variables
3. Ensure you ran the latest migration
4. Check Supabase logs for database errors
5. Review the troubleshooting section above

The testing suite is designed to catch issues early and ensure your widget core is production-ready! 🎉
