#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Performance thresholds
const THRESHOLDS = {
  widgetSize: 50 * 1024, // 50KB
  buildTime: 30000, // 30 seconds
  apiResponseTime: 1000, // 1 second
  memoryUsage: 100 * 1024 * 1024, // 100MB
};

function checkWidgetSize() {
  const widgetPath = path.join(__dirname, '../public/widget.js');
  if (!fs.existsSync(widgetPath)) {
    console.log('❌ Widget file not found');
    return false;
  }

  const stats = fs.statSync(widgetPath);
  const sizeKB = stats.size / 1024;
  const gzippedEstimate = sizeKB * 0.3;

  console.log(
    `📦 Widget size: ${sizeKB.toFixed(1)}KB (est. ${gzippedEstimate.toFixed(1)}KB gzipped)`,
  );

  if (gzippedEstimate > THRESHOLDS.widgetSize / 1024) {
    console.log('⚠️  Widget size exceeds 50KB target');
    return false;
  }

  return true;
}

function checkBuildOutput() {
  const nextDir = path.join(__dirname, '../.next');
  if (!fs.existsSync(nextDir)) {
    console.log('❌ Build output not found. Run `npm run build` first.');
    return false;
  }

  const staticDir = path.join(nextDir, 'static');
  if (fs.existsSync(staticDir)) {
    const files = fs.readdirSync(staticDir);
    const jsFiles = files.filter((f) => f.endsWith('.js'));
    console.log(`📁 Build contains ${jsFiles.length} JS files`);
  }

  return true;
}

function checkDependencies() {
  const packageJson = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../package.json')),
  );
  const deps = Object.keys(packageJson.dependencies || {});
  const devDeps = Object.keys(packageJson.devDependencies || {});

  console.log(`📦 Dependencies: ${deps.length} prod, ${devDeps.length} dev`);

  // Check for known heavy dependencies
  const heavyDeps = ['lodash', 'moment', 'date-fns', 'ramda'];
  const found = heavyDeps.filter((dep) => deps.includes(dep));

  if (found.length > 0) {
    console.log(`⚠️  Heavy dependencies found: ${found.join(', ')}`);
    return false;
  }

  return true;
}

function checkEnvironment() {
  const envPath = path.join(__dirname, '../.env.local');
  const hasEnv = fs.existsSync(envPath);

  console.log(
    `🔧 Environment: ${hasEnv ? '✅ .env.local found' : '❌ .env.local missing'}`,
  );

  if (!hasEnv) {
    console.log('   Create .env.local with required variables');
    return false;
  }

  return true;
}

function main() {
  console.log('🚀 Performance & Quality Check\n');

  const checks = [
    { name: 'Widget Size', fn: checkWidgetSize },
    { name: 'Build Output', fn: checkBuildOutput },
    { name: 'Dependencies', fn: checkDependencies },
    { name: 'Environment', fn: checkEnvironment },
  ];

  let passed = 0;

  for (const check of checks) {
    console.log(`\n🔍 ${check.name}:`);
    if (check.fn()) {
      passed++;
    }
  }

  console.log(`\n📊 Results: ${passed}/${checks.length} checks passed`);

  if (passed === checks.length) {
    console.log('🎉 All checks passed! Your app is ready for production.');
    process.exit(0);
  } else {
    console.log('⚠️  Some checks failed. Review the issues above.');
    process.exit(1);
  }
}

main();
