# 🎯 Order Status Management System

A secure, RLS-protected system for staff to manage order workflow from **pending** to **completed** with **concurrency protection** and **audit trail**.

## 🚀 **Quick Start**

### **1. Apply the Migrations**
```bash
# Run the RLS and audit migrations
supabase db push
```

### **2. Deploy the API**
```bash
# Deploy the status management endpoint
git add .
git commit -m "Add order status management with concurrency protection"
git push
```

### **3. Test the System**
```bash
# Run the test script
node scripts/test-concurrency-audit.js
```

## 📊 **Order Workflow**

### **Status Flow**
```
pending → paid → preparing → ready → completed
    ↓         ↓         ↓
cancelled  cancelled  cancelled
    ↓
  expired
```

### **Allowed Transitions**
- **pending** → `paid`, `cancelled`, `expired`
- **paid** → `preparing`, `cancelled`
- **preparing** → `ready`, `cancelled`
- **ready** → `completed`
- **completed** → (terminal)
- **cancelled** → (terminal)
- **expired** → (terminal)

## 🔐 **Security Model**

### **Authentication**
- Uses Supabase session cookies (no service role)
- Staff must be logged in to access dashboard

### **Authorization**
- **RLS Policies**: Only staff with `editor`, `manager`, or `owner` roles
- **Tenant Isolation**: Staff can only see/update orders for their restaurant
- **Status Validation**: Server validates all transitions

### **Concurrency Protection**
- **Atomic Updates**: Uses conditional UPDATE to prevent race conditions
- **Conflict Detection**: Returns 409 when status changed concurrently
- **Optimistic UI**: Rolls back on conflict with user-friendly message

### **Audit Trail**
- **Complete History**: All status changes recorded in `order_status_events`
- **RLS Protected**: Audit events follow same tenant isolation rules
- **Reason Tracking**: Optional cancellation reasons stored

## 🛠️ **API Endpoint**

### **PATCH `/api/orders/[orderId]/status`**

**Request:**
```json
{
  "status": "preparing",
  "reason": "Customer requested cancellation"
}
```

**Response:**
```json
{
  "order": {
    "id": "uuid",
    "status": "preparing",
    "restaurant_id": "uuid",
    "updated_at": "2025-01-28T10:30:00Z"
  }
}
```

**Error Responses:**
- `400` - Invalid order ID or status
- `404` - Order not found or access denied
- `409` - Invalid status transition OR concurrent change conflict
- `403` - Update failed (RLS denied)
- `500` - Unexpected error

## 🎨 **Dashboard UI**

### **Features**
- **Action Buttons**: Context-aware based on current status
- **Optimistic Updates**: UI updates immediately, rolls back on error
- **Loading States**: Visual feedback during API calls
- **Error Handling**: User-friendly error messages
- **Reason Prompts**: Optional cancellation reasons
- **Conflict Resolution**: Graceful handling of concurrent changes

### **Button Labels**
- **pending**: "Mark Paid", "Cancel"
- **paid**: "Start Preparing", "Cancel"
- **preparing**: "Mark Ready", "Cancel"
- **ready**: "Complete"
- **completed/cancelled/expired**: No actions

### **Concurrency Handling**
```tsx
// When two staff members click simultaneously:
// 1. First click: succeeds, status updated
// 2. Second click: gets 409 Conflict
// 3. UI shows: "Conflict: order moved to 'preparing'. Refresh to sync."
// 4. User can refresh to see current state
```

## 🔧 **Implementation Details**

### **Database Schema**
```sql
-- RLS policies for orders table
CREATE POLICY orders_staff_select ON public.orders
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_staff s
    WHERE s.restaurant_id = orders.restaurant_id
      AND s.user_id = auth.uid()
      AND s.role IN ('owner','manager','editor')
  )
);

CREATE POLICY orders_staff_update ON public.orders
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM public.restaurant_staff s
    WHERE s.restaurant_id = orders.restaurant_id
      AND s.user_id = auth.uid()
      AND s.role IN ('owner','manager','editor')
  )
);

-- Audit trail table
CREATE TABLE public.order_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  from_status text NOT NULL CHECK (from_status IN ('pending','paid','preparing','ready','completed','cancelled','expired')),
  to_status   text NOT NULL CHECK (to_status   IN ('pending','paid','preparing','ready','completed','cancelled','expired')),
  reason text,
  changed_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### **Atomic Update Logic**
```typescript
// Atomic conditional update to avoid race conditions
const { data: updated, error: updErr } = await supabase
  .from('orders')
  .update({ status: nextStatus })
  .eq('id', orderId)
  .eq('status', fromStatus)           // <— only update if still in fromStatus
  .select('id,status,restaurant_id,updated_at')
  .single();

if (updErr) {
  // Check if status changed concurrently
  const { data: check } = await supabase.from('orders').select('status').eq('id', orderId).single();
  if (check && check.status !== fromStatus) {
    return NextResponse.json(
      { error: 'Conflict: status changed concurrently', current: check.status },
      { status: 409 }
    );
  }
  return NextResponse.json({ error: 'Update failed' }, { status: 403 });
}
```

## 🧪 **Testing**

### **Automated Tests**
```bash
# Test API validation and concurrency
node scripts/test-concurrency-audit.js
```

### **Manual Testing**
1. **Create Order**: Use widget to place an order
2. **Login**: Access dashboard as staff member
3. **Update Status**: Click action buttons to move through workflow
4. **Test Concurrency**: Open same order in two tabs, click simultaneously
5. **Verify Audit**: Check `order_status_events` table in Supabase

### **Concurrency Testing**
```bash
# Test race condition protection
# 1. Open order in two browser tabs
# 2. Click status update in both tabs simultaneously
# 3. Verify: one succeeds, other gets 409 Conflict
# 4. Verify: UI shows conflict message and rolls back
```

### **Security Testing**
- Try accessing orders from different restaurant (should be denied)
- Try invalid status transitions (should return 409)
- Try unauthorized access (should return 404)
- Verify audit trail only shows your restaurant's events

## 📈 **Benefits**

### **For Staff**
- **Simple Interface**: One-click status updates
- **Clear Workflow**: Visual progression through order states
- **Error Prevention**: Invalid transitions blocked at API level
- **Conflict Resolution**: Clear feedback when concurrent changes occur

### **For Restaurant**
- **Real-time Updates**: Orders move through pipeline efficiently
- **Audit Trail**: All status changes tracked with timestamps and reasons
- **Customer Communication**: Status changes can trigger notifications
- **Operational Insights**: Complete history of order lifecycle

### **For System**
- **Security**: RLS ensures data isolation
- **Scalability**: Efficient queries with proper indexing
- **Maintainability**: Clean separation of concerns
- **Reliability**: Concurrency protection prevents data corruption

## 🚨 **Error Handling**

### **Common Issues**
1. **404 Not Found**: Staff not authorized for this order
2. **409 Conflict**: Invalid status transition OR concurrent change
3. **403 Forbidden**: RLS policy denied update

### **Concurrency Conflicts**
```typescript
// When two staff members update simultaneously:
// Staff A: reads status "paid", tries to update to "preparing"
// Staff B: reads status "paid", tries to update to "cancelled"
// Result: Staff A succeeds, Staff B gets 409 with message:
// "Conflict: order moved to 'preparing'. Refresh to sync."
```

### **Debugging**
```bash
# Check RLS policies
supabase db diff

# Test with real order ID
curl -X PATCH /api/orders/REAL-UUID/status \
  -H "Content-Type: application/json" \
  -d '{"status":"preparing"}'

# Check audit trail
SELECT * FROM order_status_events 
WHERE order_id = 'REAL-UUID' 
ORDER BY created_at DESC;
```

## 🎉 **Ready to Ship**

This system provides:
- ✅ **Secure order management** with RLS protection
- ✅ **Intuitive UI** with context-aware actions
- ✅ **Robust validation** preventing invalid transitions
- ✅ **Real-time updates** with optimistic UI
- ✅ **Concurrency protection** preventing race conditions
- ✅ **Complete audit trail** for operational insights
- ✅ **Production-ready** error handling

Staff can now efficiently manage orders through the complete workflow with enterprise-grade reliability! 🚀
