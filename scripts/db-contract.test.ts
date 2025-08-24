import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!url || !anon || !service) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Get restaurant ID from environment or use a default
const RESTAURANT_ID = process.env.RESTAURANT_ID || '64806e5b-714f-4388-a092-29feff9b64c0';

console.log('🧪 Starting Widget Core Contract Tests...');
console.log(`📊 Testing with restaurant ID: ${RESTAURANT_ID}`);
console.log('');

async function runTests() {
  let passed = 0;
  let failed = 0;

  const test = async (name: string, fn: () => Promise<void>) => {
    try {
      await fn();
      console.log(`✅ ${name}`);
      passed++;
    } catch (error) {
      console.log(`❌ ${name}: ${error}`);
      failed++;
    }
  };

  // Test 1: Anon can create session/event with allowed origin
  await test('Anon can create session with allowed origin', async () => {
    const sb = createClient(url, anon, {
      global: { headers: { origin: 'https://demo.example' } },
      auth: { persistSession: false },
    });

    const sessionToken = `test-session-${Date.now()}`;
    
    const { data: ws, error: e1 } = await sb
      .from('widget_sessions')
      .insert({ 
        restaurant_id: RESTAURANT_ID, 
        session_token: sessionToken, 
        origin: 'https://demo.example', 
        user_agent: 'UA/1' 
      })
      .select()
      .single();

    if (e1) throw new Error(`Session creation failed: ${e1.message}`);
    if (!ws) throw new Error('Session not created');

    const { error: e2 } = await sb
      .from('widget_events')
      .insert({ 
        restaurant_id: RESTAURANT_ID, 
        session_id: ws.id, 
        type: 'open', 
        payload: { smoke: true } 
      });

    if (e2) throw new Error(`Event creation failed: ${e2.message}`);
  });

  // Test 2: Anon can create chat messages
  await test('Anon can create chat messages', async () => {
    const sb = createClient(url, anon, {
      global: { headers: { origin: 'https://demo.example' } },
      auth: { persistSession: false },
    });

    // Get existing session or create one
    const { data: sessions } = await sb
      .from('widget_sessions')
      .select('id')
      .eq('restaurant_id', RESTAURANT_ID)
      .limit(1);

    if (!sessions || sessions.length === 0) {
      throw new Error('No sessions found for testing');
    }

    const { error } = await sb
      .from('chat_messages')
      .insert({ 
        restaurant_id: RESTAURANT_ID, 
        session_id: sessions[0].id, 
        role: 'user', 
        content: 'Hello from test' 
      });

    if (error) throw new Error(`Chat message creation failed: ${error.message}`);
  });

  // Test 3: Anon blocked for cache table
  await test('Anon blocked for cache table', async () => {
    const sbAnon = createClient(url, anon, { 
      auth: { persistSession: false } 
    });

    const { error } = await sbAnon
      .from('chat_response_cache')
      .insert({ 
        restaurant_id: RESTAURANT_ID, 
        cache_key: 'test-cache-key', 
        reply: { test: true }, 
        expires_at: new Date(Date.now() + 86400000).toISOString() 
      });

    if (!error) throw new Error('Anon should be blocked from cache table');
  });

  // Test 4: Service role allowed for cache table
  await test('Service role allowed for cache table', async () => {
    const sbSvc = createClient(url, service, { 
      auth: { persistSession: false } 
    });

    const { error } = await sbSvc
      .from('chat_response_cache')
      .insert({ 
        restaurant_id: RESTAURANT_ID, 
        cache_key: `test-cache-key-${Date.now()}`, 
        reply: { test: true }, 
        expires_at: new Date(Date.now() + 86400000).toISOString() 
      });

    if (error) throw new Error(`Service role cache access failed: ${error.message}`);
  });

  // Test 5: Anon blocked with disallowed origin
  await test('Anon blocked with disallowed origin', async () => {
    const sb = createClient(url, anon, {
      global: { headers: { origin: 'https://evil.example' } },
      auth: { persistSession: false },
    });

    const { error } = await sb
      .from('widget_sessions')
      .insert({ 
        restaurant_id: RESTAURANT_ID, 
        session_token: `test-session-evil-${Date.now()}`, 
        origin: 'https://evil.example', 
        user_agent: 'UA/1' 
      });

    if (!error) throw new Error('Anon should be blocked with disallowed origin');
  });

  // Test 6: Function calls work
  await test('restaurant_open_now function works', async () => {
    const sb = createClient(url, service, { 
      auth: { persistSession: false } 
    });

    const { data, error } = await sb.rpc('restaurant_open_now', {
      p_restaurant: RESTAURANT_ID
    });

    if (error) throw new Error(`Function call failed: ${error.message}`);
    if (typeof data !== 'boolean') throw new Error('Function should return boolean');
  });

  // Test 7: origin_allowed function works
  await test('origin_allowed function works', async () => {
    const sb = createClient(url, service, { 
      auth: { persistSession: false } 
    });

    const { data, error } = await sb.rpc('origin_allowed', {
      p_restaurant: RESTAURANT_ID,
      p_origin: 'https://demo.example'
    });

    if (error) throw new Error(`Function call failed: ${error.message}`);
    if (typeof data !== 'boolean') throw new Error('Function should return boolean');
  });

  // Test 8: slugify function works
  await test('slugify function works', async () => {
    const sb = createClient(url, service, { 
      auth: { persistSession: false } 
    });

    const { data, error } = await sb.rpc('slugify', {
      txt: 'Test Restaurant & Bistro'
    });

    if (error) throw new Error(`Function call failed: ${error.message}`);
    if (typeof data !== 'string') throw new Error('Function should return string');
    if (!data.includes('test-restaurant')) throw new Error('Slug should contain sanitized text');
  });

  // Test 9: Can read existing data
  await test('Can read existing data', async () => {
    const sb = createClient(url, anon, { 
      auth: { persistSession: false } 
    });

    const { data: restaurants, error: e1 } = await sb
      .from('restaurants')
      .select('id, name')
      .eq('id', RESTAURANT_ID);

    if (e1) throw new Error(`Restaurant read failed: ${e1.message}`);
    if (!restaurants || restaurants.length === 0) throw new Error('Restaurant not found');

    const { data: sessions, error: e2 } = await sb
      .from('widget_sessions')
      .select('id, session_token')
      .eq('restaurant_id', RESTAURANT_ID)
      .limit(5);

    if (e2) throw new Error(`Sessions read failed: ${e2.message}`);
  });

  // Test 10: Indexes exist and queries are fast
  await test('Indexes work for performance', async () => {
    const sb = createClient(url, anon, { 
      auth: { persistSession: false } 
    });

    const start = Date.now();
    
    const { data, error } = await sb
      .from('widget_sessions')
      .select('id')
      .eq('restaurant_id', RESTAURANT_ID)
      .order('last_seen_at', { ascending: false })
      .limit(10);

    const duration = Date.now() - start;

    if (error) throw new Error(`Indexed query failed: ${error.message}`);
    if (duration > 1000) throw new Error(`Query too slow: ${duration}ms`);
  });

  console.log('');
  console.log('📊 Test Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log('');
    console.log('❌ Some tests failed. Check the errors above.');
    process.exit(1);
  } else {
    console.log('');
    console.log('🎉 All tests passed! Widget core is working correctly.');
  }
}

// Run the tests
runTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
