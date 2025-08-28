# LLM Chat System Setup Guide

This guide walks you through setting up the LLM-powered chat system with RAG (Retrieval-Augmented Generation) for restaurant menus.

## 🚀 Quick Start

### 1. Environment Variables

Add these to your `.env.local` and Vercel environment:

```bash
# Required for LLM functionality
OPENAI_API_KEY=sk-...                    # Your OpenAI API key
CHAT_LLM_ENABLED=1                       # Enable LLM chat (0 = rules only)
CHAT_MODEL=gpt-4o-mini                   # LLM model for chat
EMBED_MODEL=text-embedding-3-small       # Embedding model for RAG
RAG_TOP_K=6                              # Number of items to retrieve
RAG_SIM_THRESHOLD=0.72                   # Similarity threshold
LLM_TOKEN_BUDGET=1200                    # Max tokens per response

# Supabase (required)
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...            # Server routes must use service key
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Optional: Pilot restaurant ID
PILOT_RESTAURANT_ID=64806e5b-714f-4388-a092-29feff9b64c0
```

### 2. Database Setup

Run these migrations in Supabase SQL Editor:

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create embeddings table
CREATE TABLE IF NOT EXISTS menu_item_embeddings (
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  item_id TEXT REFERENCES menu_items(id) ON DELETE CASCADE,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (restaurant_id, item_id)
);

-- Create index for similarity search
CREATE INDEX IF NOT EXISTS menu_item_embeddings_idx 
ON menu_item_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS usage_counters (
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  period TEXT NOT NULL, -- YYYY-MM format
  messages_used INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (restaurant_id, period)
);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION touch_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER touch_usage_updated_at
  BEFORE UPDATE ON usage_counters
  FOR EACH ROW
  EXECUTE FUNCTION touch_usage_updated_at();
```

### 3. Backfill Embeddings

For each restaurant that needs LLM chat:

```bash
# Install tsx if not already installed
npm install -g tsx

# Backfill embeddings for a restaurant
tsx scripts/backfill_embeddings.ts <restaurant-id>
```

### 4. Verify Setup

Run the verification script:

```bash
node scripts/pilot-verification.js
```

This will check:
- ✅ Environment variables
- ✅ Database setup (pgvector, tables, indexes)
- ✅ Embeddings for pilot restaurant
- ✅ Vector search functionality
- ✅ Chat API endpoints

## 🔧 Configuration

### Model Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `CHAT_MODEL` | `gpt-4o-mini` | LLM for generating responses |
| `EMBED_MODEL` | `text-embedding-3-small` | Model for creating embeddings |
| `RAG_TOP_K` | `6` | Number of menu items to retrieve |
| `RAG_SIM_THRESHOLD` | `0.72` | Minimum similarity score |
| `LLM_TOKEN_BUDGET` | `1200` | Max tokens per response |

### Plan Limits

The system enforces usage limits based on restaurant plans:

| Plan | Messages/Month | Tokens/Month |
|------|----------------|--------------|
| Lite | 100 | 5,000 |
| Standard | 1,000 | 50,000 |
| Pro | 10,000 | 500,000 |
| Unlimited | ∞ | ∞ |

## 🛡️ Safety Features

### Pilot Restaurants

Only restaurants in the `PILOT_RESTAURANTS` array can use LLM chat:

```typescript
const PILOT_RESTAURANTS = [
  '64806e5b-714f-4388-a092-29feff9b64c0', // Your pilot restaurant
  // Add more pilot restaurant IDs here
];
```

### Response Validation

The system validates LLM responses to prevent:
- ❌ Invented menu items
- ❌ Incorrect prices
- ❌ Hallucinated information

### Graceful Fallbacks

If LLM fails, the system automatically falls back to rule-based responses.

## 📊 Monitoring

### Telemetry Events

The system logs detailed telemetry for each chat interaction:

```typescript
{
  restaurantId: string;
  sessionToken: string;
  retrievalIds: string[];      // Menu items retrieved
  token_in: number;           // Input tokens used
  token_out: number;          // Output tokens used
  model: string;              // Model used (llm/rules)
  latency_ms: number;         // Response time
  validator_pass: boolean;    // Response validation result
  source: 'llm' | 'rules';    // Response source
  message: string;            // User message
}
```

### Usage Tracking

Usage is tracked per restaurant per month in the `usage_counters` table.

## 🚨 Troubleshooting

### Common Issues

1. **"No embeddings found"**
   - Run backfill script: `tsx scripts/backfill_embeddings.ts <restaurant-id>`

2. **"Vector search failed"**
   - Check pgvector extension: `SELECT extname FROM pg_extension WHERE extname='vector';`
   - Verify embeddings table exists and has data

3. **"LLM chat not working"**
   - Check `CHAT_LLM_ENABLED=1`
   - Verify `OPENAI_API_KEY` is set
   - Ensure restaurant is in `PILOT_RESTAURANTS` array

4. **"High latency"**
   - Reduce `RAG_TOP_K` or increase `RAG_SIM_THRESHOLD`
   - Check vector index performance

### Debug Mode

Enable debug logging by setting:

```bash
DEBUG=1
```

This will log detailed information about:
- Embedding creation
- Vector search results
- LLM prompts and responses
- Validation results

## 🔄 Rollback Plan

To instantly disable LLM chat:

1. **Environment Variable**: Set `CHAT_LLM_ENABLED=0`
2. **Deploy**: The system will immediately fall back to rule-based responses
3. **No Data Loss**: All embeddings and usage data remain intact

## 📈 Performance Optimization

### Vector Search

- **Index**: Uses `ivfflat` with 100 lists for fast similarity search
- **Threshold**: Adjust `RAG_SIM_THRESHOLD` for precision vs recall
- **Top-K**: Reduce `RAG_TOP_K` for faster responses

### LLM Optimization

- **Model**: `gpt-4o-mini` provides good quality at lower cost
- **Tokens**: `LLM_TOKEN_BUDGET=1200` balances quality and cost
- **Caching**: Responses are cached to reduce API calls

### Cost Control

- **Quotas**: Enforced per restaurant plan
- **Monitoring**: Track usage in `usage_counters` table
- **Alerts**: Set up alerts for high usage

## 🎯 Pilot Success Metrics

Track these metrics for the first 7 days:

- **Chat Helpfulness**: ≥ 4/5 (owner survey)
- **Menu Accuracy**: 100% (no wrong items/prices)
- **Cost per Chat**: ≤ $0.03 USD
- **Response Time**: ≤ 2 seconds
- **Fallback Rate**: ≤ 5% (LLM failures)

## 📞 Support

If you encounter issues:

1. Run the verification script: `node scripts/pilot-verification.js`
2. Check the logs for detailed error messages
3. Verify environment variables are set correctly
4. Ensure database migrations are applied

The system is designed to be resilient and will gracefully handle most errors while maintaining a good user experience.
