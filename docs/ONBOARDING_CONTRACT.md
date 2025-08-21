# Onboarding Contract v1

This document defines the stable contract for the restaurant onboarding flow. **Do not change this contract** without updating this document and all dependent code.

## Database Contract

### RPC Function: `create_restaurant_tenant`

**Signature:**
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

**Behavior:**
1. Creates a restaurant with the given details
2. Creates an owner staff record for the authenticated user
3. Creates a default "Mains" menu section
4. Uses upsert logic to handle duplicate restaurant names per owner

**Required Database Constraints:**
- `restaurants` table must have unique constraint on `(owner_id, name)`
- `restaurants.address` and `restaurants.city` must have NOT NULL constraints

## Client Contract

### Form Data
- `name`: Restaurant name (required, min 2 chars)
- `description`: Restaurant description (optional)
- `cuisine_type`: Cuisine type (required)
- `email`: User email (required, valid format)
- `password`: User password (required, min 8 chars)

### Server Action Contract
```typescript
const { data, error } = await supabase.rpc('create_restaurant_tenant', {
  p_name: name,
  p_desc: description ?? null,
  p_cuisine: cuisine ?? null,
  p_address: address ?? '',
  p_city: city ?? 'Stockholm',
  p_country: country ?? 'SE',
});
```

## Authentication Contract

### Supabase Auth Settings (MVP)
- **Enable email signups**: ON
- **Confirm email**: OFF
- **hCaptcha**: OFF
- **Disable new users from signing up**: OFF

### Flow
1. Client validates form data
2. Client calls `supabase.auth.signUp()`
3. On 422 "already registered", fallback to `signInWithPassword()`
4. After successful auth, POST to `/auth/callback` to sync cookies
5. Call server action `createTenant()` with all 6 parameters
6. Redirect to `/dashboard/menu?welcome=true`

## Success Criteria

### Network Sequence
1. `POST /auth/v1/signup` → 200 (or 422 then sign-in → 200)
2. `POST /auth/callback` → 200
3. `POST /onboard` → 200 → redirect to dashboard

### Database State
- One restaurant record with owner_id = authenticated user
- One restaurant_staff record with role = 'owner'
- One menu_sections record with name = 'Mains'

## Testing

### Smoke Test
Run `node scripts/test-onboarding.js` to verify the complete flow.

### Manual Test
1. Use a fresh email address
2. Use password ≥ 8 characters
3. Fill out all required fields
4. Submit form
5. Verify redirect to dashboard

## Breaking Changes

If this contract needs to change:
1. Update this document
2. Update all client code
3. Update database migrations
4. Update smoke tests
5. Test thoroughly before deployment
