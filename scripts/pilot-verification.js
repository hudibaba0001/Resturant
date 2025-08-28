#!/usr/bin/env node

/**
 * Pilot Verification Script for LLM Chat System
 * Runs all checks and provides clear pass/fail status
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const CHAT_LLM_ENABLED = process.env.CHAT_LLM_ENABLED === '1';
const PILOT_RESTAURANT_ID = process.env.PILOT_RESTAURANT_ID || '64806e5b-714f-4388-a092-29feff9b64c0';

// Colors for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log(`\n${colors.bold}${colors.blue}=== ${title} ===${colors.reset}`);
}

function logPass(message) {
  log(`✅ ${message}`, 'green');
}

function logFail(message) {
  log(`❌ ${message}`, 'red');
}

function logWarn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

async function checkEnvironment() {
  logSection('Environment Variables');
  
  const checks = [
    { name: 'SUPABASE_URL', value: SUPABASE_URL, required: true },
    { name: 'SUPABASE_SERVICE_ROLE_KEY', value: SUPABASE_SERVICE_ROLE_KEY, required: true },
    { name: 'OPENAI_API_KEY', value: OPENAI_API_KEY, required: true },
    { name: 'CHAT_LLM_ENABLED', value: CHAT_LLM_ENABLED, required: false },
    { name: 'PILOT_RESTAURANT_ID', value: PILOT_RESTAURANT_ID, required: true }
  ];

  let allPassed = true;
  for (const check of checks) {
    if (check.required && !check.value) {
      logFail(`${check.name} is missing`);
      allPassed = false;
    } else if (check.value) {
      logPass(`${check.name} is set`);
    } else {
      logWarn(`${check.name} is not set (optional)`);
    }
  }

  if (CHAT_LLM_ENABLED) {
    logPass('LLM chat is ENABLED');
  } else {
    logWarn('LLM chat is DISABLED (will fallback to rules)');
  }

  return allPassed;
}

async function checkDatabase() {
  logSection('Database Setup');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    logFail('Cannot check database - missing Supabase credentials');
    return false;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    // Check pgvector extension
    const { data: extensions, error: extError } = await supabase
      .from('pg_extension')
      .select('extname')
      .eq('extname', 'vector');
    
    if (extError) {
      logFail(`pgvector extension check failed: ${extError.message}`);
      return false;
    }
    
    if (extensions && extensions.length > 0) {
      logPass('pgvector extension is installed');
    } else {
      logFail('pgvector extension is not installed');
      return false;
    }

    // Check menu_item_embeddings table
    const { data: embeddings, error: embError } = await supabase
      .from('menu_item_embeddings')
      .select('count', { count: 'exact' });
    
    if (embError) {
      logFail(`menu_item_embeddings table check failed: ${embError.message}`);
      return false;
    }
    
    const count = embeddings || 0;
    if (count > 0) {
      logPass(`menu_item_embeddings table has ${count} records`);
    } else {
      logFail('menu_item_embeddings table is empty');
      return false;
    }

    // Check vector dimensions
    const { data: dims, error: dimError } = await supabase
      .rpc('vector_dims', { embedding: [0.1, 0.2, 0.3] });
    
    if (dimError) {
      logWarn('Could not check vector dimensions');
    } else {
      logPass(`Vector dimensions: ${dims}`);
    }

    // Check pilot restaurant embeddings
    const { data: pilotEmbeddings, error: pilotError } = await supabase
      .from('menu_item_embeddings')
      .select('item_id')
      .eq('restaurant_id', PILOT_RESTAURANT_ID);
    
    if (pilotError) {
      logFail(`Pilot restaurant embeddings check failed: ${pilotError.message}`);
      return false;
    }
    
    if (pilotEmbeddings && pilotEmbeddings.length > 0) {
      logPass(`Pilot restaurant has ${pilotEmbeddings.length} embeddings`);
    } else {
      logFail(`Pilot restaurant has no embeddings`);
      return false;
    }

    return true;
  } catch (error) {
    logFail(`Database check failed: ${error.message}`);
    return false;
  }
}

async function checkUsageTables() {
  logSection('Usage Tracking');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    logFail('Cannot check usage tables - missing Supabase credentials');
    return false;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    // Check usage_counters table
    const { data: usage, error: usageError } = await supabase
      .from('usage_counters')
      .select('restaurant_id, period, messages_used, tokens_used')
      .eq('restaurant_id', PILOT_RESTAURANT_ID)
      .limit(1);
    
    if (usageError) {
      logFail(`usage_counters table check failed: ${usageError.message}`);
      return false;
    }
    
    logPass('usage_counters table is accessible');
    
    if (usage && usage.length > 0) {
      const current = usage[0];
      logPass(`Current usage: ${current.messages_used} messages, ${current.tokens_used} tokens (${current.period})`);
    } else {
      logWarn('No usage records found for pilot restaurant');
    }

    return true;
  } catch (error) {
    logFail(`Usage check failed: ${error.message}`);
    return false;
  }
}

async function testChatAPI() {
  logSection('Chat API Test');
  
  const baseUrl = process.env.NODE_ENV === 'production' 
    ? 'https://resturant-two-xi.vercel.app'
    : 'http://localhost:3000';
  
  try {
    // Test basic chat request
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Widget-Version': '1.0.0'
      },
      body: JSON.stringify({
        restaurantId: PILOT_RESTAURANT_ID,
        sessionToken: 'pilot-test',
        message: 'Italian dishes?'
      })
    });

    if (!response.ok) {
      logFail(`Chat API returned ${response.status}: ${response.statusText}`);
      return false;
    }

    const data = await response.json();
    
    if (!data.reply || !data.cards) {
      logFail('Chat API response missing required fields');
      return false;
    }

    logPass(`Chat API responded successfully`);
    logPass(`Reply: "${data.reply.text.substring(0, 50)}..."`);
    logPass(`Cards: ${data.cards.length} items returned`);
    
    if (data.reply.chips && data.reply.chips.length > 0) {
      logPass(`Chips: ${data.reply.chips.join(', ')}`);
    }

    return true;
  } catch (error) {
    logFail(`Chat API test failed: ${error.message}`);
    return false;
  }
}

async function testVectorSearch() {
  logSection('Vector Search Test');
  
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    logFail('Cannot test vector search - missing Supabase credentials');
    return false;
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  
  try {
    // Create a test embedding (dummy vector)
    const testEmbedding = Array.from({ length: 1536 }, () => Math.random() * 2 - 1);
    
    const { data: results, error } = await supabase.rpc('match_menu_items', {
      query_embedding: testEmbedding,
      match_threshold: 0.72,
      match_count: 6,
      p_restaurant_id: PILOT_RESTAURANT_ID
    });
    
    if (error) {
      logFail(`Vector search failed: ${error.message}`);
      return false;
    }
    
    if (results && results.length > 0) {
      logPass(`Vector search returned ${results.length} results`);
      logPass(`Top result: "${results[0].name}" (similarity: ${results[0].similarity.toFixed(3)})`);
    } else {
      logWarn('Vector search returned no results (threshold may be too high)');
    }

    return true;
  } catch (error) {
    logFail(`Vector search test failed: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log(`${colors.bold}${colors.blue}🚀 LLM Chat Pilot Verification${colors.reset}\n`);
  
  const checks = [
    { name: 'Environment', fn: checkEnvironment },
    { name: 'Database', fn: checkDatabase },
    { name: 'Usage Tables', fn: checkUsageTables },
    { name: 'Vector Search', fn: testVectorSearch },
    { name: 'Chat API', fn: testChatAPI }
  ];

  const results = {};
  
  for (const check of checks) {
    try {
      results[check.name] = await check.fn();
    } catch (error) {
      logFail(`${check.name} check crashed: ${error.message}`);
      results[check.name] = false;
    }
  }

  // Summary
  logSection('Summary');
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  if (passed === total) {
    logPass(`All ${total} checks passed! 🎉`);
    logPass('LLM chat system is ready for pilot');
  } else {
    logFail(`${passed}/${total} checks passed`);
    logWarn('Please fix the failed checks before enabling LLM chat');
  }

  // Detailed results
  console.log('\nDetailed Results:');
  for (const [name, passed] of Object.entries(results)) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const color = passed ? 'green' : 'red';
    log(`${status} ${name}`, color);
  }

  // Next steps
  if (passed === total) {
    console.log(`\n${colors.bold}${colors.green}Next Steps:${colors.reset}`);
    console.log('1. Set CHAT_LLM_ENABLED=1 in Vercel environment');
    console.log('2. Deploy to production');
    console.log('3. Test with pilot restaurant');
    console.log('4. Monitor logs for telemetry events');
  } else {
    console.log(`\n${colors.bold}${colors.red}Action Required:${colors.reset}`);
    console.log('1. Fix failed checks above');
    console.log('2. Run this script again');
    console.log('3. Only enable LLM when all checks pass');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };
