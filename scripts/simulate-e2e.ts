/* Run fake journey without LLM cost */
const [,, restaurantId, base='http://localhost:3000'] = process.argv;
const headers = { 'Content-Type':'application/json', 'X-Widget-Version': 'sim-1' };
const s = 'sim-'+Math.random().toString(36).slice(2);

async function menu() {
  const r = await fetch(`${base}/api/public/menu?restaurantId=${restaurantId}`);
  console.log('menu', r.status);
}
async function chat(q: string) {
  const r = await fetch(`${base}/api/chat`, { method:'POST', headers, body: JSON.stringify({ restaurantId: restaurantId, sessionToken: s, message: q }) });
  console.log('chat', q, r.status);
}
await menu();
await chat('Italian dishes?');
await chat('Budget options');
console.log('done');
