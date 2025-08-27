# LLM Chat System Setup Guide

## Overview
This system adds OpenAI-powered chat with RAG (Retrieval-Augmented Generation) to the restaurant widget, with fallback to rule-based responses and quota management.

## Environment Variables

Add these to your **Vercel + `.env.local`**:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-key-here
CHAT_LLM_ENABLED=1
CHAT_MODEL=gpt-4o-mini
EMBED_MODEL=text-embedding-3-small

# RAG Configuration
RAG_TOP_K=6
RAG_SIM_THRESHOLD=0.72
LLM_TOKEN_BUDGET=1200
```

## Database Setup

### 1. Run Migrations

Apply these migrations in your Supabase SQL editor:

1. **pgvector extension**: `supabase/migrations/20250827_pgvector.sql`
2. **usage tracking**: `supabase/migrations/20250827_usage.sql`
3. **vector search function**: `supabase/migrations/20250827_vector_search.sql`

### 2. Backfill Embeddings

For each restaurant, run:

```bash
# Install ts-node if not already installed
npm install -g ts-node

# Run backfill script
ts-node scripts/backfill_embeddings.ts <restaurant-id>
```

Example:
```bash
ts-node scripts/backfill_embeddings.ts 64806e5b-714f-4388-a092-29feff9b64c0
```

## Testing

### 1. Local Testing

```bash
# Start dev server
npm run dev

# Test chat system
node scripts/test-llm-chat.js <restaurant-id>
```

### 2. Production Testing

```bash
# Test against production
BASE_URL=https://your-domain.vercel.app node scripts/test-llm-chat.js <restaurant-id>
```

## Feature Flags

- **Enable LLM**: Set `CHAT_LLM_ENABLED=1`
- **Disable LLM**: Set `CHAT_LLM_ENABLED=0` (instant fallback to rules)
- **No OpenAI key**: System automatically falls back to rule engine

## Quota Management

The system includes usage tracking with plan-based limits:

- **Lite**: 100 messages/month
- **Standard**: 1,000 messages/month  
- **Pro**: 10,000 messages/month
- **Unlimited**: No limits

When quota is exceeded, users see "Upgrade plan" chip.

## Monitoring

### Telemetry Logs

The system logs structured events:

```json
{
  "type": "chat_event",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "restaurantId": "uuid",
  "sessionToken": "widget-abc123",
  "retrievalIds": ["item1", "item2"],
  "token_in": 150,
  "token_out": 50,
  "model": "gpt-4o-mini",
  "latency_ms": 1200,
  "validator_pass": true,
  "source": "llm"
}
```

### Error Logs

```json
{
  "type": "error",
  "timestamp": "2025-01-27T10:30:00.000Z",
  "context": "llm_chat_failed",
  "error": "OpenAI API error",
  "restaurantId": "uuid"
}
```

## Architecture

### Flow Diagram

```
User Message → Quota Check → LLM Enabled? → Yes → Embedding Search → LLM Chat → Validation → Response
                                    ↓ No
                              Rule Engine → Response
```

### Components

1. **Quota System** (`lib/quotas.ts`)
   - Plan-based limits
   - Usage tracking
   - Graceful fallback

2. **Telemetry** (`lib/telemetry.ts`)
   - Structured logging
   - Performance metrics
   - Error tracking

3. **Chat Route** (`app/api/chat/route.ts`)
   - LLM + RAG integration
   - Response validation
   - Fallback handling

4. **Vector Search** (Database function)
   - pgvector similarity search
   - Restaurant-scoped retrieval

## Troubleshooting

### Common Issues

1. **"No embeddings found"**
   - Run backfill script for the restaurant
   - Check `menu_item_embeddings` table

2. **"LLM chat failed"**
   - Verify `OPENAI_API_KEY` is set
   - Check OpenAI API quota
   - System falls back to rules automatically

3. **"Quota exceeded"**
   - Upgrade restaurant plan
   - Check usage in `usage_counters` table

4. **"Vector search failed"**
   - Verify pgvector extension is installed
   - Check `match_menu_items` function exists

### Debug Mode

Add to `.env.local`:
```bash
DEBUG=1
```

This enables verbose logging in the chat route.

## Performance

### Expected Latency

- **LLM + RAG**: 1-3 seconds
- **Rule Engine**: <100ms
- **Fallback**: <200ms

### Cost Optimization

- **Embedding model**: `text-embedding-3-small` (cheapest)
- **Chat model**: `gpt-4o-mini` (good balance)
- **Token budget**: 1200 tokens max
- **Retrieval limit**: 6 items max

## Security

- All embeddings are restaurant-scoped
- No PII in logs
- Rate limiting on embeddings
- Input validation with Zod
- Response validation prevents hallucination
