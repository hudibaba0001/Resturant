#!/usr/bin/env node

/**
 * CI Guard: Detect mixed dynamic parameter names in API routes
 * Prevents routing conflicts like [id] vs [orderId] in the same path
 * Run with: node scripts/check-dynamic-params.js
 */

const fs = require('fs');
const path = require('path');

const roots = ['app/api', 'pages/api'].filter((p) => fs.existsSync(p));
const seen = new Map(); // key: normalized route, value: Set of param names

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

function normRoute(file) {
  // Convert filesystem path to a route key where dynamic segments are replaced with []
  const rel = file.replace(/\\/g, '/');
  const m = rel.match(/(app|pages)\/api\/(.+)\/route\.ts$|pages\/api\/(.+)\.ts$/);
  if (!m) return null;
  const route = (m[2] || m[3] || '').replace(/\[(.+?)\]/g, '[]');
  const params = [...(m[2] || m[3] || '').matchAll(/\[(.+?)\]/g)].map((x) => x[1]);
  return { key: route, params };
}

console.log('🔍 Checking for dynamic route parameter conflicts...\n');

for (const root of roots) {
  for (const f of walk(root)) {
    const r = normRoute(f);
    if (!r) continue;
    const set = seen.get(r.key) || new Set();
    r.params.forEach((p) => set.add(p));
    seen.set(r.key, set);
  }
}

const conflicts = [...seen.entries()].filter(([, set]) => set.size > 1);

if (conflicts.length) {
  console.error('❌ Dynamic route param conflicts detected:');
  console.error('==========================================');
  for (const [key, set] of conflicts) {
    console.error(`   /api/${key}: [${[...set].join(', ')}]`);
  }
  console.error('\n💡 Fix: Use consistent parameter names across all routes');
  console.error('   Example: Change [id] to [orderId] in all /api/orders/* routes');
  console.error('\n🚫 Build failed due to routing conflicts');
  process.exit(1);
}

console.log('✅ No dynamic route parameter conflicts found');
console.log('✅ All API routes use consistent parameter names');
console.log('\n🚀 Build can proceed safely');
