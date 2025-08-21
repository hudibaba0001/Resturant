# Onboarding Implementation Guide

This document describes the complete onboarding implementation with robust auth handling, RPC contracts, and CI guardrails.

## 🏗️ Architecture Overview

### Core Components

1. **Server Supabase Client** (`lib/supabaseServer.ts`)
   - Proper cookie adapter for RLS enforcement
   - Used by all server actions and API routes

2. **Auth Cookie Sync** (`app/auth/callback/route.ts`)
   - Handles session synchronization between client and server
   - Critical for RLS to work properly

3. **Signup Client** (`app/onboard/SignupClient.tsx`)
   - Robust 422/400 error handling
   - Automatic fallback to signin for existing users
   - Exact error display in UI

4. **Server Action** (`app/onboard/actions.ts`)
   - Uses server client with proper RLS
   - 6-arg RPC contract with validation
   - Comprehensive error handling

## 🔐 Authentication Flow

### Network Sequence
1. `POST /auth/v1/signup` → 200 (or 422 then sign-in → 200)
2. `POST /auth/callback` → 200 (cookie sync)
3. `POST /onboard` → 200 (server action)
4. Redirect to `/dashboard/menu?welcome=true`

### Error Handling
- **422 "already registered"**: Auto-fallback to `signInWithPassword`
- **Password < 8 chars**: Client validation with clear message
- **Invalid email**: Client validation with clear message
- **RPC errors**: Exact error message from Supabase displayed

## 🗄️ Database Contract

### RPC Function: `create_restaurant_tenant`
```sql
create_restaurant_tenant(
  p_name    text,
  p_desc    text,
  p_cuisine text default null,
  p_address text default '',
  p_city    text default 'Stockholm',
  p_country text default 'SE'
) returns uuid
```

### Required Constraints
- `restaurants` table: `UNIQUE (owner_id, name)`
- `restaurants.address`: `NOT NULL`
- `restaurants.city`: `NOT NULL`

## 🧪 Testing

### Manual Test
1. Go to `http://localhost:3001/onboard`
2. Use fresh email (e.g., `test123@example.com`)
3. Use strong password (e.g., `Abcd1234!` - ≥8 chars)
4. Fill required fields and submit
5. Verify redirect to dashboard

### Automated Test
```bash
node scripts/test-onboarding.js
```

### Schema Validation
```bash
node scripts/schema-doctor.mjs
```

## 🚀 Deployment

### Supabase Setup
1. Run the SQL migration in Supabase Dashboard → SQL Editor:
   ```sql
   -- Copy content from supabase/migrations/2025-08-21_onboarding_contract.sql
   ```

2. Verify Auth Settings:
   - **Enable email signups**: ON
   - **Confirm email**: OFF
   - **hCaptcha**: OFF
   - **Disable new users**: OFF

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 🔒 Security Features

### RLS Enforcement
- All server actions use `getSupabaseServer()` with proper cookies
- RPC function uses `auth.uid()` for user context
- No client-side RLS bypass

### Input Validation
- Client-side validation for immediate feedback
- Server-side Zod validation for security
- SQL injection protection via parameterized queries

### Error Handling
- No sensitive data in error messages
- Graceful degradation for network issues
- Clear user feedback for all error states

## 📊 CI/CD Guardrails

### Database Schema Validation
- SQLFluff linting on migrations
- Schema doctor validates constraints
- Prevents RPC overloading
- Ensures NOT NULL compliance

### Automated Checks
- Unique constraint on `(owner_id, name)`
- Single RPC function signature
- Price field type validation
- Required column constraints

## 🐛 Troubleshooting

### Common Issues

1. **"ambiguous function" error**
   - Run the SQL migration to remove old overloads
   - Verify only one RPC signature exists

2. **"null value in column address"**
   - Migration includes data cleanup for existing rows
   - Verify NOT NULL constraints are applied

3. **"not_authenticated" error**
   - Check cookie sync is working
   - Verify auth callback endpoint is accessible

4. **422 signup errors**
   - Check Supabase Auth settings
   - Verify email confirmation is OFF
   - Check password length (≥8 chars)

### Debug Steps
1. Check browser network tab for auth requests
2. Verify Supabase logs for RPC calls
3. Run schema doctor to validate database state
4. Test with fresh email address

## 📈 Success Metrics

### Acceptance Criteria
- ✅ New user with valid password can sign up
- ✅ Restaurant created with owner staff record
- ✅ Default "Mains" menu section created
- ✅ Redirect to dashboard with welcome message
- ✅ RLS properly enforced throughout

### Performance
- Signup to dashboard: < 5 seconds
- RPC response time: < 500ms
- Cookie sync: < 200ms

## 🔄 Future Enhancements

### Phase 2 Considerations
- Email confirmation flow
- Multi-step onboarding wizard
- Restaurant logo upload
- Address validation
- Payment method setup

### Monitoring
- Sentry error tracking
- Supabase analytics
- Performance monitoring
- User journey tracking
