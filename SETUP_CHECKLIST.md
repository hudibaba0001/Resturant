# 🚀 Restaurant Platform Setup Checklist (15 min)

## ✅ **1) Supabase (EU) Setup**

- [ ] Create project in **EU region** (not US)
- [ ] **Settings → API**: Copy Project URL + service_role key
- [ ] **SQL Editor**: Run schema migrations (restaurants + menu/chat/orders + RPC)
- [ ] **Seed demo data** (paste in SQL Editor):

```sql
-- One restaurant
insert into public.restaurants (id, name, slug, is_active, is_verified, opening_hours)
values (
  gen_random_uuid(), 'Demo Bistro', 'demo-bistro', true, true,
  jsonb_build_object(
    'monday',  jsonb_build_object('open','09:00','close','17:00'),
    'tuesday', jsonb_build_object('open','09:00','close','17:00'),
    'wednesday',jsonb_build_object('open','09:00','close','17:00'),
    'thursday', jsonb_build_object('open','09:00','close','17:00'),
    'friday',  jsonb_build_object('open','09:00','close','20:00'),
    'saturday',jsonb_build_object('open','10:00','close','16:00'),
    'sunday',  jsonb_build_object('open',null,'close',null)
  )
) returning id;
-- Copy the returned UUID below as :restaurant_id
-- Section + 2 items
with r as (select ':restaurant_id'::uuid as rid)
insert into public.menu_sections (restaurant_id, name, position) select rid,'Mains',0 from r;
with r as (select ':restaurant_id'::uuid as rid),
s as (select id from public.menu_sections where restaurant_id = ':restaurant_id'::uuid limit 1)
insert into public.menu_items (restaurant_id, section_id, name, description, price_cents, currency, tags, is_available)
select r.rid, s.id, 'Grilled Veggie Bowl','High-protein, vegan',11900,'SEK','["vegan","high-protein"]'::jsonb,true from r,s
union all
select r.rid, s.id, 'Chicken Caesar','Contains dairy',12900,'SEK','["contains-dairy"]'::jsonb,true from r,s;
```

- [ ] **Grab IDs for tests**:

```sql
select id as restaurant_id from public.restaurants where slug='demo-bistro';
select id as item_id, name from public.menu_items where restaurant_id=':restaurant_id'::uuid;
```

**📝 Notes:**
- Restaurant ID: `_________________`
- Item ID: `_________________`

---

## ✅ **2) Vercel Environment Variables**

**Settings → Environment Variables** (Production + Preview):

- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://<your-project>.supabase.co`
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = `<service_role key>`
- [ ] `OPENAI_API_KEY` = `<your key>`
- [ ] `OPENAI_CHAT_MODEL` = `gpt-4o-mini`
- [ ] `OPENAI_EMBEDDING_MODEL` = `text-embedding-3-small`
- [ ] `STRIPE_SECRET_KEY` = `sk_test_...`
- [ ] `NEXT_PUBLIC_WIDGET_ORIGIN` = `https://<your-project>.vercel.app`

- [ ] **Save → Redeploy**
- [ ] **Settings → Functions → Region = FRA1 (Frankfurt)**

---

## ✅ **3) Stripe Webhook (after first deploy)**

- [ ] Stripe → **Developers → Webhooks → Add endpoint**
- [ ] URL: `https://<your-project>.vercel.app/api/stripe/webhook`
- [ ] Events: `checkout.session.completed`, `checkout.session.expired`
- [ ] Copy **Signing secret** → Vercel env `STRIPE_WEBHOOK_SECRET`
- [ ] **Redeploy**

### **Quick Webhook Test**
- [ ] Stripe → Webhooks → your endpoint → **Send test event** → `checkout.session.completed`
- [ ] Check Vercel Logs → should see 200 response
- [ ] In Supabase → orders.status flips to **paid** for real checkouts

---

## ✅ **4) Smoke Tests**

### **Chat Test**
```bash
curl -X POST https://<your-project>.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":"<RESTAURANT_UUID>","sessionToken":"demo-1","message":"What are your vegan options?"}'
```

- [ ] Expect: `{ reply, suggestions: [...] }`
- [ ] Empty suggestions are OK for first demo

### **Order Test (dine-in, no Stripe)**
```bash
curl -X POST https://<your-project>.vercel.app/api/orders \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":"<RESTAURANT_UUID>","sessionToken":"demo-1","type":"dine_in","items":[{"itemId":"<ITEM_UUID>","qty":1}]}'
```

- [ ] Expect: `{ "orderCode": "XXXXXX" }`
- [ ] Check Supabase → orders table for new row

### **Order Test (pickup, with Stripe)**
```bash
curl -X POST https://<your-project>.vercel.app/api/orders \
  -H "Content-Type: application/json" \
  -d '{"restaurantId":"<RESTAURANT_UUID>","sessionToken":"demo-1","type":"pickup","items":[{"itemId":"<ITEM_UUID>","qty":1}]}'
```

- [ ] Expect: `{ "checkoutUrl": "https://checkout.stripe.com/..." }`
- [ ] Complete payment → `orders.status` flips to **paid** (webhook)

---

## ✅ **5) Embed Widget**

```html
<script src="https://<your-project>.vercel.app/widget.js"
        data-restaurant="<RESTAURANT_UUID>" defer></script>
```

- [ ] Test on any website
- [ ] Chat widget appears
- [ ] Can ask questions about menu

---

## 🎯 **Demo Ready!**

**Acceptance Criteria:**
- [ ] **Chat** answers basic questions about menu
- [ ] **Dine-in** creates order with code (no Stripe needed)
- [ ] **Pickup** opens Stripe checkout; payment → webhook → status=paid
- [ ] **Embed** works on any real website

**What works:**
- ✅ AI chat with restaurant context
- ✅ Menu item suggestions (may be empty initially)
- ✅ Dine-in orders (instant order codes)
- ✅ Pickup orders (Stripe checkout)
- ✅ Webhook payment confirmation
- ✅ Embeddable widget

**Next steps (later):**
- 🔄 Auto item embeddings job (improves suggestions)
- 📊 Analytics dashboard
- 🎨 Custom widget styling

---

## 🚨 **Troubleshooting**

**Build fails:**
- [ ] Check Vercel env names match exactly
- [ ] Ensure Supabase project is in EU region
- [ ] Redeploy after env changes

**Chat/Orders fail:**
- [ ] Verify restaurant/item UUIDs are correct
- [ ] Check OpenAI API key is valid
- [ ] Ensure Stripe keys are test mode

**Webhook fails:**
- [ ] Verify webhook URL is correct
- [ ] Check `STRIPE_WEBHOOK_SECRET` in Vercel
- [ ] Ensure webhook events are selected

---

**⏱️ Time: ~15 minutes**
**🎯 Goal: Demo-ready embed widget**
