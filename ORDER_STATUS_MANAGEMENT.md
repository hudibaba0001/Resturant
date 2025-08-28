# 🎯 Order Status Management System

A secure, RLS-protected system for staff to manage order workflow from **pending** to **completed**.

## 🚀 **Quick Start**

### **1. Apply the Migration**
```bash
# Run the RLS migration
supabase db push
```

### **2. Deploy the API**
```bash
# Deploy the status management endpoint
git add .
git commit -m "Add order status management"
git push
```

### **3. Test the System**
```bash
# Run the test script
node scripts/test-order-status.js
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

### **API Security**
```typescript
// No service role - uses cookies auth
const supabase = createRouteHandlerClient({ cookies });

// RLS enforces permissions at DB level
const { data: current } = await supabase
  .from('orders')
  .select('id,status,restaurant_id')
  .eq('id', orderId)
  .single();
```

## 🛠️ **API Endpoint**

### **PATCH `/api/orders/[orderId]/status`**

**Request:**
```json
{
  "status": "preparing"
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
- `409` - Invalid status transition
- `403` - Update failed (RLS denied)
- `500` - Unexpected error

## 🎨 **Dashboard UI**

### **Features**
- **Action Buttons**: Context-aware based on current status
- **Optimistic Updates**: UI updates immediately, rolls back on error
- **Loading States**: Visual feedback during API calls
- **Error Handling**: User-friendly error messages

### **Button Labels**
- **pending**: "Mark Paid", "Cancel"
- **paid**: "Start Preparing", "Cancel"
- **preparing**: "Mark Ready", "Cancel"
- **ready**: "Complete"
- **completed/cancelled/expired**: No actions

### **Usage**
```tsx
// Staff clicks "Start Preparing" on a paid order
// → API validates transition (paid → preparing)
// → RLS ensures staff can update this order
// → Order status updated in database
// → UI shows "Mark Ready" and "Cancel" buttons
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
```

### **Type Safety**
```typescript
type OrderStatus = 
  | 'pending' | 'paid' | 'preparing' 
  | 'ready' | 'completed' | 'cancelled' | 'expired';

const ALLOWED: Record<OrderStatus, OrderStatus[]> = {
  pending: ['paid', 'cancelled', 'expired'],
  paid: ['preparing', 'cancelled'],
  // ... etc
};
```

## 🧪 **Testing**

### **Automated Tests**
```bash
# Test API validation
node scripts/test-order-status.js
```

### **Manual Testing**
1. **Create Order**: Use widget to place an order
2. **Login**: Access dashboard as staff member
3. **Update Status**: Click action buttons to move through workflow
4. **Verify**: Check that only valid transitions are allowed

### **Security Testing**
- Try accessing orders from different restaurant (should be denied)
- Try invalid status transitions (should return 409)
- Try unauthorized access (should return 404)

## 📈 **Benefits**

### **For Staff**
- **Simple Interface**: One-click status updates
- **Clear Workflow**: Visual progression through order states
- **Error Prevention**: Invalid transitions blocked at API level

### **For Restaurant**
- **Real-time Updates**: Orders move through pipeline efficiently
- **Audit Trail**: All status changes tracked with timestamps
- **Customer Communication**: Status changes can trigger notifications

### **For System**
- **Security**: RLS ensures data isolation
- **Scalability**: Efficient queries with proper indexing
- **Maintainability**: Clean separation of concerns

## 🚨 **Error Handling**

### **Common Issues**
1. **404 Not Found**: Staff not authorized for this order
2. **409 Conflict**: Invalid status transition attempted
3. **403 Forbidden**: RLS policy denied update

### **Debugging**
```bash
# Check RLS policies
supabase db diff

# Test with real order ID
curl -X PATCH /api/orders/REAL-UUID/status \
  -H "Content-Type: application/json" \
  -d '{"status":"preparing"}'
```

## 🎉 **Ready to Ship**

This system provides:
- ✅ **Secure order management** with RLS protection
- ✅ **Intuitive UI** with context-aware actions
- ✅ **Robust validation** preventing invalid transitions
- ✅ **Real-time updates** with optimistic UI
- ✅ **Production-ready** error handling

Staff can now efficiently manage orders through the complete workflow! 🚀
