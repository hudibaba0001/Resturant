#!/usr/bin/env node

const https = require('https');
const http = require('http');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';
const RESTAURANT_ID =
  process.env.RESTAURANT_ID || '64806e5b-714f-4388-a092-29feff9b64c0';

const endpoints = ['/api/public/status', '/api/public/menu', '/api/health'];

async function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const client = url.startsWith('https') ? https : http;

    client
      .get(url, (res) => {
        const end = Date.now();
        const duration = end - start;

        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            duration,
            size: data.length,
          });
        });
      })
      .on('error', reject);
  });
}

async function benchmark() {
  console.log('🚀 API Response Time Benchmark\n');

  for (const endpoint of endpoints) {
    const url = `${API_BASE}${endpoint}`;
    try {
      const result = await makeRequest(url);
      const status = result.status === 200 ? '✅' : '❌';
      console.log(`${status} ${endpoint}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Time: ${result.duration}ms`);
      console.log(`   Size: ${result.size} bytes`);

      if (result.duration > 1000) {
        console.log(`   ⚠️  Slow response (>1s)`);
      }
      console.log('');
    } catch (error) {
      console.log(`❌ ${endpoint} - Error: ${error.message}\n`);
    }
  }
}

benchmark().catch(console.error);
