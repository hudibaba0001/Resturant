/* Run: tsx scripts/warm-cache.ts RESTAURANT_ID http://localhost:3000 */
const [,, restaurantId, base='http://localhost:3000'] = process.argv;
const headers = { 'Content-Type':'application/json', 'X-Widget-Version': 'warm-1' };

async function ask(msg: string) {
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ restaurantId: restaurantId, sessionToken: 'warm-'+msg, message: msg }),
  });
  console.log(msg, res.status, await res.text());
}

await ask('Italian dishes?');
await ask('Vegan options?');
await ask('What is popular?');
console.log('done');
