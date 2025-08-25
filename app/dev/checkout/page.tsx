export const dynamic = 'force-dynamic';

export default function DevCheckout({ searchParams }: { searchParams: { orderId?: string } }) {
  const orderId = searchParams?.orderId ?? '';
  return (
    <main style={{ maxWidth: 520, margin: '4rem auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Mock Checkout (Pickup)</h1>
      <p>Order ID: <code>{orderId}</code></p>

      <form method="POST" action="/api/dev/mark-paid">
        <input type="hidden" name="orderId" value={orderId} />
        <button type="submit" style={{ padding: '10px 16px' }}>Pay now (simulate)</button>
      </form>

      <p style={{ marginTop: 12, color: '#666' }}>
        This page simulates payment in development.
      </p>
    </main>
  );
}
