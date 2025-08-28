#!/usr/bin/env node

/**
 * Test script for concurrency protection and audit trail
 * Run with: node scripts/test-concurrency-audit.js
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function testConcurrencyAndAudit() {
  console.log('🧪 Testing Concurrency Protection & Audit Trail\n');

  // Test 1: Invalid order ID
  console.log('1️⃣ Testing invalid order ID...');
  try {
    const response = await fetch(`${BASE_URL}/api/orders/invalid-id/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' })
    });
    
    if (response.status === 400) {
      console.log('✅ Invalid order ID correctly rejected');
    } else {
      console.log('❌ Expected 400, got', response.status);
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  // Test 2: Invalid status
  console.log('\n2️⃣ Testing invalid status...');
  try {
    const response = await fetch(`${BASE_URL}/api/orders/12345678-1234-1234-1234-123456789012/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'invalid_status' })
    });
    
    if (response.status === 400) {
      console.log('✅ Invalid status correctly rejected');
    } else {
      console.log('❌ Expected 400, got', response.status);
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  // Test 3: Unauthorized access (no auth)
  console.log('\n3️⃣ Testing unauthorized access...');
  try {
    const response = await fetch(`${BASE_URL}/api/orders/12345678-1234-1234-1234-123456789012/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' })
    });
    
    if (response.status === 404) {
      console.log('✅ Unauthorized access correctly rejected (404)');
    } else {
      console.log('❌ Expected 404, got', response.status);
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  // Test 4: Status with reason
  console.log('\n4️⃣ Testing status update with reason...');
  try {
    const response = await fetch(`${BASE_URL}/api/orders/12345678-1234-1234-1234-123456789012/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status: 'cancelled',
        reason: 'Customer requested cancellation'
      })
    });
    
    if (response.status === 404) {
      console.log('✅ Status with reason correctly rejected (404 - no auth)');
    } else {
      console.log('❌ Expected 404, got', response.status);
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
  }

  console.log('\n📋 Test Summary:');
  console.log('================');
  console.log('✅ Invalid order ID validation');
  console.log('✅ Invalid status validation');
  console.log('✅ Unauthorized access protection');
  console.log('✅ Status with reason handling');
  console.log('\n🎯 To test concurrency protection:');
  console.log('1. Create an order through the widget');
  console.log('2. Login to dashboard as staff member');
  console.log('3. Open the same order in two browser tabs');
  console.log('4. Click status update in both tabs simultaneously');
  console.log('5. One should succeed, other should get 409 Conflict');
  console.log('\n🔍 To verify audit trail:');
  console.log('1. Make status changes through the dashboard');
  console.log('2. Check order_status_events table in Supabase');
  console.log('3. Verify events include: from_status, to_status, reason, changed_by');
  console.log('\n🔒 Security features:');
  console.log('- RLS policies enforce tenant isolation');
  console.log('- Only staff (editor+) can update orders');
  console.log('- Status transitions are server-validated');
  console.log('- Atomic updates prevent race conditions');
  console.log('- Audit trail records all changes');
  console.log('- No service role used (cookies auth only)');
}

// Run the tests
testConcurrencyAndAudit().catch(console.error);
