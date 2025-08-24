#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const WIDGET_PATH = path.join(__dirname, '../public/widget.js');
const MAX_SIZE_KB = 50; // 50KB gzipped target

function getFileSize(filePath) {
  const stats = fs.statSync(filePath);
  return stats.size;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function main() {
  if (!fs.existsSync(WIDGET_PATH)) {
    console.error('❌ Widget file not found. Run build first.');
    process.exit(1);
  }

  const size = getFileSize(WIDGET_PATH);
  const sizeKB = size / 1024;
  const gzippedEstimate = sizeKB * 0.3; // Rough gzip compression estimate

  console.log(`📦 Widget bundle size: ${formatBytes(size)}`);
  console.log(`🗜️  Estimated gzipped: ~${gzippedEstimate.toFixed(1)}KB`);

  if (gzippedEstimate > MAX_SIZE_KB) {
    console.error(`❌ Bundle too large! Target: ${MAX_SIZE_KB}KB gzipped`);
    console.log('💡 Consider:');
    console.log('   - Removing unused dependencies');
    console.log('   - Code splitting non-critical features');
    console.log('   - Optimizing images/icons');
    process.exit(1);
  } else {
    console.log(`✅ Bundle size within target (${MAX_SIZE_KB}KB)`);
  }
}

main();
