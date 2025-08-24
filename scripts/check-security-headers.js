#!/usr/bin/env node

const https = require('https');
const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

const requiredHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-XSS-Protection': '1; mode=block',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

async function checkHeaders(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;

    client
      .get(url, (res) => {
        const headers = res.headers;
        const results = {};

        for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
          const actualValue = headers[header.toLowerCase()];
          results[header] = {
            present: !!actualValue,
            correct: actualValue === expectedValue,
            actual: actualValue,
            expected: expectedValue,
          };
        }

        resolve(results);
      })
      .on('error', reject);
  });
}

async function main() {
  console.log('🔒 Security Headers Check\n');

  try {
    const results = await checkHeaders(BASE_URL);
    let allPassed = true;

    for (const [header, result] of Object.entries(results)) {
      const status = result.present && result.correct ? '✅' : '❌';
      console.log(`${status} ${header}`);

      if (!result.present) {
        console.log(`   Missing header`);
        allPassed = false;
      } else if (!result.correct) {
        console.log(`   Expected: ${result.expected}`);
        console.log(`   Actual: ${result.actual}`);
        allPassed = false;
      } else {
        console.log(`   ✓ ${result.actual}`);
      }
      console.log('');
    }

    if (allPassed) {
      console.log('🎉 All security headers are properly configured!');
      process.exit(0);
    } else {
      console.log('⚠️  Some security headers need attention.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error checking headers:', error.message);
    process.exit(1);
  }
}

main();
