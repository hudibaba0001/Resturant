#!/usr/bin/env tsx

/**
 * Backfill menu item embeddings for LLM chat
 * Usage: tsx scripts/backfill_embeddings.ts <restaurantId>
 */

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const EMBED_MODEL = process.env.EMBED_MODEL || 'text-embedding-3-small';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  allergens: string[] | null;
  price_cents: number | null;
}

async function getMenuItems(restaurantId: string): Promise<MenuItem[]> {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, description, category, allergens, price_cents')
    .eq('restaurant_id', restaurantId);

  if (error) {
    throw new Error(`Failed to fetch menu items: ${error.message}`);
  }

  return data || [];
}

async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBED_MODEL,
    input: text,
  });

  const embedding = response.data[0]?.embedding;
  if (!embedding) {
    throw new Error('Failed to create embedding');
  }

  return embedding;
}

async function upsertEmbedding(
  restaurantId: string,
  itemId: string,
  embedding: number[]
): Promise<void> {
  const { error } = await supabase
    .from('menu_item_embeddings')
    .upsert({
      restaurant_id: restaurantId,
      item_id: itemId,
      embedding,
    }, {
      onConflict: 'restaurant_id,item_id'
    });

  if (error) {
    throw new Error(`Failed to upsert embedding: ${error.message}`);
  }
}

async function backfillEmbeddings(restaurantId: string): Promise<void> {
  console.log(`🚀 Starting embedding backfill for restaurant: ${restaurantId}`);

  // Get menu items
  const menuItems = await getMenuItems(restaurantId);
  console.log(`📋 Found ${menuItems.length} menu items`);

  if (menuItems.length === 0) {
    console.log('⚠️  No menu items found for this restaurant');
    return;
  }

  let successCount = 0;
  let errorCount = 0;

  for (const [index, item] of menuItems.entries()) {
    try {
      // Create text representation for embedding
      const textParts = [
        item.name,
        item.description,
        item.category,
        ...(item.allergens || []),
        item.price_cents ? `${item.price_cents / 100} SEK` : ''
      ].filter(Boolean);

      const text = textParts.join(' ');
      
      if (!text.trim()) {
        console.log(`⚠️  Skipping item ${item.id} - no text content`);
        continue;
      }

      console.log(`🔄 Processing ${index + 1}/${menuItems.length}: "${item.name}"`);

      // Create embedding
      const embedding = await createEmbedding(text);

      // Upsert to database
      await upsertEmbedding(restaurantId, item.id, embedding);

      successCount++;
      console.log(`✅ Successfully embedded: "${item.name}"`);

      // Rate limiting - small delay between requests
      await new Promise(resolve => setTimeout(resolve, 100));

    } catch (error) {
      errorCount++;
      console.error(`❌ Failed to embed "${item.name}":`, error);
    }
  }

  console.log(`\n🎉 Backfill completed!`);
  console.log(`✅ Success: ${successCount} items`);
  console.log(`❌ Errors: ${errorCount} items`);
  console.log(`📊 Total processed: ${successCount + errorCount}/${menuItems.length}`);
}

async function main() {
  const restaurantId = process.argv[2];

  if (!restaurantId) {
    console.error('❌ Please provide a restaurant ID');
    console.error('Usage: tsx scripts/backfill_embeddings.ts <restaurantId>');
    process.exit(1);
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
  }

  if (!OPENAI_API_KEY) {
    console.error('❌ Missing OpenAI API key');
    process.exit(1);
  }

  try {
    await backfillEmbeddings(restaurantId);
  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
