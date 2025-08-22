# 🚀 Restaurant Activation Guide

## Overview
This guide will help you activate your restaurant and add menu items so you can see the full widget experience.

## 🎯 Current Status
- ✅ **Auth working** - You can log into dashboard
- ✅ **Dashboard pages working** - Menu, Orders, Settings, Embed all load
- ⏳ **Restaurant needs activation** - Widget shows demo content
- ⏳ **Menu items needed** - Widget shows placeholder items

## 📋 Step-by-Step Activation

### Step 1: Get Your Restaurant ID

**Option A: From Dashboard (Easiest)**
1. Go to your dashboard → **Embed** page
2. Look at the embed code: `<script src="..." data-restaurant="YOUR-ID-HERE" defer></script>`
3. Copy the `YOUR-ID-HERE` part (it's a UUID like `12345678-1234-1234-1234-123456789abc`)

**Option B: Using Script**
1. Edit `scripts/get-restaurant-id.js`
2. Replace `'your-email@example.com'` with your actual email
3. Run: `node scripts/get-restaurant-id.js`

### Step 2: Activate Your Restaurant

**Option A: SQL (Recommended)**
1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy the SQL from `scripts/activate-restaurant.sql`
3. Replace `'YOUR-RESTAURANT-ID-HERE'` with your actual restaurant ID
4. Run the SQL

**Option B: Node.js Script**
1. Get your **Service Role Key** from Supabase Dashboard → Settings → API
2. Set environment variable: `export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"`
3. Edit `scripts/activate-restaurant.js`
4. Replace `'YOUR-RESTAURANT-ID-HERE'` with your actual restaurant ID
5. Run: `node scripts/activate-restaurant.js`

### Step 3: Verify Activation

**Check Status API:**
```bash
# Replace with your actual values
BASE="https://your-vercel-domain.vercel.app"
RID="your-restaurant-id"

curl "$BASE/api/public/status?restaurantId=$RID"
# Should return: {"open": true/false}
```

**Check Menu API:**
```bash
curl "$BASE/api/public/menu?restaurantId=$RID"
# Should return your menu items
```

### Step 4: Test the Widget

1. **Refresh your dashboard**
2. **Go to Embed page** - yellow warning should be gone
3. **Try the widget preview**:
   - Click "Menu & Order" button
   - Browse menu items
   - Add items to cart
   - Try "Dine-in" (generates order code)
   - Try "Pickup" (Stripe checkout if configured)

## 🍕 What Gets Added

### Restaurant Activation
- ✅ `is_active = true`
- ✅ `is_verified = true`
- ✅ Opening hours: 11:00-22:00 weekdays, 12:00-23:00 weekends

### Sample Menu Items
- **Margherita Pizza** - 99 SEK (Mains)
- **Caesar Salad** - 79 SEK (Salads)
- **Pasta Carbonara** - 89 SEK (Mains)
- **Tiramisu** - 59 SEK (Desserts)

## 🔧 Troubleshooting

### Yellow Banner Still Shows
- **Cause**: Vercel environment points to different Supabase project
- **Fix**: Check `NEXT_PUBLIC_SUPABASE_URL` in Vercel Production settings

### Widget Shows But No Items
- **Cause**: Menu items not added to correct restaurant
- **Fix**: Verify `menu_items.restaurant_id` matches your restaurant ID

### Status Says "Closed"
- **Cause**: Opening hours don't cover current time
- **Fix**: Adjust `opening_hours` in the activation script

### Script Errors
- **Missing Service Role Key**: Get from Supabase Dashboard → Settings → API
- **Wrong Restaurant ID**: Double-check the ID from Embed page
- **Permission Errors**: Ensure you're using the service role key, not anon key

## 🎉 Expected Results

After activation:
- ✅ **Embed page**: No yellow warning
- ✅ **Widget preview**: Shows real menu items
- ✅ **Chat feature**: AI can answer questions about your menu
- ✅ **Ordering**: Customers can add items and place orders
- ✅ **Status**: Shows "Open" during business hours

## 📈 Next Steps

Once activated:
1. **Test the full widget experience**
2. **Customize menu items** (via API or wait for CRUD UI)
3. **Configure Stripe** for payment processing
4. **Embed on your website** using the provided code

## 🆘 Need Help?

If you encounter issues:
1. Check the troubleshooting section above
2. Verify your Supabase project matches Vercel environment
3. Ensure you're using the correct restaurant ID
4. Check browser console for any JavaScript errors

---

**Happy activating! 🚀**
