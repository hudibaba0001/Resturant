#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const restaurantId = process.argv[2];
if (!restaurantId) {
  console.error('Usage: ts-node scripts/backfill_embeddings.ts <restaurantId>');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function getMenuItems(restaurantId: string) {
  const { data, error } = await supabase
    .from('menu_items')
    .select('id, name, description, allergens, category, price_cents')
    .eq('restaurant_id', restaurantId);

  if (error) {
    console.error('Failed to fetch menu items:', error);
    throw error;
  }

  return data || [];
}

function buildItemText(item: any): string {
  const parts = [
    item.name,
    item.description || '',
    item.category || '',
    item.allergens ? `tags: ${item.allergens.join(', ')}` : ''
  ].filter(Boolean);
  
  return parts.join(' — ');
}

async function createEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: text,
  });
  
  return response.data[0].embedding;
}

async function upsertEmbedding(restaurantId: string, itemId: string, embedding: number[]) {
  const { error } = await supabase
    .from('menu_item_embeddings')
    .upsert({
      restaurant_id: restaurantId,
      item_id: itemId,
      embedding: embedding,
      updated_at: new Date().toISOString()
    });

  if (error) {
    console.error(`Failed to upsert embedding for item ${itemId}:`, error);
    throw error;
  }
}

async function processItem(item: any, index: number, total: number) {
  try {
    console.log(`Processing item ${index + 1}/${total}: ${item.name}`);
    
    const text = buildItemText(item);
    const embedding = await createEmbedding(text);
    await upsertEmbedding(restaurantId, item.id, embedding);
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
    
    console.log(`✓ Processed: ${item.name}`);
  } catch (error) {
    console.error(`✗ Failed to process ${item.name}:`, error);
    throw error;
  }
}

async function backfillEmbeddings() {
  console.log(`Starting embeddings backfill for restaurant: ${restaurantId}`);
  
  try {
    const items = await getMenuItems(restaurantId);
    console.log(`Found ${items.length} menu items to process`);
    
    if (items.length === 0) {
      console.log('No items found, exiting');
      return;
    }
    
    // Process with concurrency control
    const concurrency = 4;
    const batches = [];
    
    for (let i = 0; i < items.length; i += concurrency) {
      batches.push(items.slice(i, i + concurrency));
    }
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`Processing batch ${batchIndex + 1}/${batches.length}`);
      
      const promises = batch.map((item, index) => 
        processItem(item, batchIndex * concurrency + index, items.length)
      );
      
      await Promise.all(promises);
    }
    
    console.log('✅ Embeddings backfill completed successfully');
  } catch (error) {
    console.error('❌ Embeddings backfill failed:', error);
    process.exit(1);
  }
}

backfillEmbeddings();
