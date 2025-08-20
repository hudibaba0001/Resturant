# 🚀 Complete Database Setup Guide

## 📋 **Step-by-Step Setup**

### **Step 1: Run Main Schema Migration**
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste the entire contents of `restaurants_table.sql`
4. Click **Run**

### **Step 2: Run Database Fixes**
1. In the same SQL Editor, copy and paste the contents of `database_fixes.sql`
2. Click **Run**

**This fixes:**
- ✅ Enables `pgcrypto` for `gen_random_uuid()`
- ✅ Fixes foreign keys to reference `auth.users` instead of `public.users`
- ✅ Hardens `has_restaurant_permission()` function with `SECURITY DEFINER`
- ✅ Adds `WITH CHECK` clauses to RLS policies for INSERT/UPDATE
- ✅ Adds `updated_at` triggers to all timestamped tables

### **Step 3: Run Menu Items Migration**
1. Copy and paste the contents of `supabase/migrations/03_match_menu_items.sql`
2. Click **Run**

### **Step 4: Create Demo Data**
```bash
node create_demo_data.js
```

This will create:
- 🏪 **Demo Bistro** restaurant
- 🍽️ **Mains** menu section  
- 🥗 **Grilled Veggie Bowl** (vegan, 119 SEK)
- 🥗 **Chicken Caesar Salad** (contains dairy, 129 SEK)

### **Step 5: Get UUIDs for Smoke Tests**
The script will output:
```
RESTAURANT_UUID=<actual-uuid>
ITEM_UUID=<actual-uuid>
BASE=https://resturant-q5tagaio9-lovedeep-singhs-projects-96b003a8.vercel.app
```

## 🧪 **Smoke Tests**

Once you have the UUIDs, run these tests:

### **1. Chat Test**
```bash
curl -X POST https://resturant-q5tagaio9-lovedeep-singhs-projects-96b003a8.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":"<RESTAURANT_UUID>","sessionToken":"demo-1","message":"What are your vegan options?"}'
```

### **2. Dine-in Order Test**
```bash
curl -X POST https://resturant-q5tagaio9-lovedeep-singhs-projects-96b003a8.vercel.app/api/orders \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":"<RESTAURANT_UUID>","sessionToken":"demo-1","type":"dine_in","items":[{"itemId":"<ITEM_UUID>","qty":1}]}'
```

### **3. Pickup Order Test (with Stripe)**
```bash
curl -X POST https://resturant-q5tagaio9-lovedeep-singhs-projects-96b003a8.vercel.app/api/orders \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":"<RESTAURANT_UUID>","sessionToken":"demo-1","type":"pickup","items":[{"itemId":"<ITEM_UUID>","qty":1}]}'
```

## ✅ **Expected Results**

- **Chat**: Returns `{ reply, suggestions: [...] }`
- **Dine-in**: Returns `{ orderCode: "XXXXXX" }`
- **Pickup**: Returns `{ checkoutUrl: "https://checkout.stripe.com/..." }`

## 🔧 **Troubleshooting**

### **If migrations fail:**
- Check that your Supabase project is in **EU region**
- Ensure you have the **service role key** (not anon key)
- Verify the SQL syntax is correct

### **If demo data creation fails:**
- Ensure all migrations ran successfully
- Check that the `owner_id` placeholder is valid
- Verify RLS policies are working correctly

### **If smoke tests fail:**
- Verify environment variables are set in Vercel
- Check that the UUIDs are correct
- Ensure the API endpoints are deployed

## 🎯 **Success Criteria**

- ✅ Database schema created with all tables
- ✅ RLS policies working correctly
- ✅ Demo data created successfully
- ✅ Chat API responds with restaurant context
- ✅ Orders API creates orders (dine-in) and Stripe sessions (pickup)
- ✅ Widget can be embedded on any website

**Ready for demo! 🚀**
