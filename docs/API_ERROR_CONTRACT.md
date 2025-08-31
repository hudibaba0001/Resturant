# API Error Contract (MVP)

Clients should expect structured JSON errors:

```json
{ "code": "BAD_REQUEST" }
```

Recommended common codes:
- `BAD_REQUEST` – Validation failed
- `SESSION_INVALID` – Session could not be resolved
- `BAD_LINE_ID_FORMAT` – Non-UUID itemId
- `INTERNAL_ERROR` – Generic server error

This aligns the mixed patterns noted in the code health audit without forcing a rewrite today.
Wire `lib/api/response.ts` in routes as you touch them next.
