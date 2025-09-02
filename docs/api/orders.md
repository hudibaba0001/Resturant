# Orders API

## POST `/api/orders`

Creates a new order with items.

### Request

Accepts **either**:

#### JSON Body (Recommended)
```json
{
  "restaurantId": "uuid",
  "sessionToken": "uuid", 
  "type": "pickup",
  "items": [
    {
      "itemId": "uuid",
      "qty": 1
    }
  ]
}
```

#### Query Parameters (Fallback)
```
?restaurantId=uuid&sessionToken=uuid&type=pickup&items=[{"itemId":"uuid","qty":1}]
```

### Response

#### Success (200)
```json
{
  "orderId": "uuid",
  "orderCode": "ABC123",
  "totalCents": 200,
  "currency": "SEK",
  "items": [
    {
      "itemId": "uuid",
      "qty": 1,
      "price_cents": 200
    }
  ],
  "createdAt": "2025-01-02T10:30:00Z",
  "_src": "orders-v1"
}
```

#### Errors

**400 Bad Request**
```json
{
  "code": "BAD_REQUEST",
  "reason": "INVALID_INPUT"
}
```

**400 Bad Restaurant**
```json
{
  "code": "BAD_RESTAURANT",
  "_src": "orders-v1"
}
```

**500 Server Misconfiguration**
```json
{
  "code": "SERVER_MISCONFIG",
  "missing": {
    "supabaseUrl": false,
    "supabaseKey": true
  }
}
```

### Headers

- `Origin`: Must match restaurant's `allowed_origins`
- `Referer`: Must match restaurant's `allowed_origins`
- `Content-Type`: `application/json` (for JSON body)

### Validation

- `restaurantId`: Valid UUID
- `sessionToken`: Valid UUID, must belong to restaurant
- `type`: `pickup` or `delivery`
- `items`: Array with at least one item
- `itemId`: Valid UUID, must belong to restaurant
- `qty`: Positive integer, max 99

### Database Schema

- **orders**: Main order record
- **order_items**: Individual line items
- **menu_items_v2**: Item pricing and validation
- **widget_sessions**: Session authentication
- **restaurants**: Tenant isolation

### Security

- Uses `SUPABASE_SERVICE_ROLE_KEY` (server-side only)
- Row Level Security (RLS) enabled on all tables
- Tenant isolation via `restaurant_id` foreign keys
- Origin validation against `allowed_origins`
