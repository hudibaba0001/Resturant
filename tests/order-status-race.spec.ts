import { test, expect } from '@playwright/test';

test.describe('Order Status Race Condition Tests', () => {
  test('race condition produces single success and one 409', async ({ browser }) => {
    // Create two separate browser contexts to simulate different users
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    // Navigate to orders dashboard in both contexts
    await pageA.goto('/dashboard/orders');
    await pageB.goto('/dashboard/orders');

    // Wait for orders to load
    await pageA.waitForSelector('[data-testid="orders-table"]');
    await pageB.waitForSelector('[data-testid="orders-table"]');

    // Find a pending order (one that can be updated)
    const pendingOrderRow = await pageA.locator('[data-testid="order-row"]').filter({ hasText: 'Pending' }).first();
    
    if (!(await pendingOrderRow.count())) {
      test.skip('No pending orders available for testing');
      return;
    }

    const orderId = await pendingOrderRow.getAttribute('data-order-id');
    if (!orderId) {
      test.skip('Order row missing data-order-id attribute');
      return;
    }

    // Select the same order in both contexts
    const selector = `[data-testid="order-row-${orderId}"]`;
    await Promise.all([
      pageA.waitForSelector(selector),
      pageB.waitForSelector(selector)
    ]);

    // Click different status updates simultaneously
    const [r1, r2] = await Promise.allSettled([
      pageA.locator(`${selector} button:has-text("Mark Paid")`).click(),
      pageB.locator(`${selector} button:has-text("Cancel")`).click(),
    ]);

    // Wait a moment for UI updates
    await pageA.waitForTimeout(1000);
    await pageB.waitForTimeout(1000);

    // One should succeed, one should fail with conflict
    // Check for conflict message on either page
    const conflictMessageA = pageA.getByText(/Conflict: order moved/);
    const conflictMessageB = pageB.getByText(/Conflict: order moved/);
    
    // At least one page should show the conflict message
    await expect(conflictMessageA.or(conflictMessageB)).toBeVisible({ timeout: 5000 });

    // Verify that only one status change succeeded
    const successIndicatorA = pageA.locator(`${selector} [data-testid="status-badge"]`);
    const successIndicatorB = pageB.locator(`${selector} [data-testid="status-badge"]`);
    
    // Both should show the same final status (the one that succeeded)
    const statusA = await successIndicatorA.textContent();
    const statusB = await successIndicatorB.textContent();
    
    expect(statusA).toBe(statusB);
    expect(['Paid', 'Cancelled']).toContain(statusA);

    // Clean up
    await ctxA.close();
    await ctxB.close();
  });

  test('concurrent updates to different orders should both succeed', async ({ browser }) => {
    const ctxA = await browser.newContext();
    const ctxB = await browser.newContext();
    const pageA = await ctxA.newPage();
    const pageB = await ctxB.newPage();

    await pageA.goto('/dashboard/orders');
    await pageB.goto('/dashboard/orders');

    await pageA.waitForSelector('[data-testid="orders-table"]');
    await pageB.waitForSelector('[data-testid="orders-table"]');

    // Find two different pending orders
    const pendingOrders = await pageA.locator('[data-testid="order-row"]').filter({ hasText: 'Pending' }).all();
    
    if (pendingOrders.length < 2) {
      test.skip('Need at least 2 pending orders for this test');
      return;
    }

    const order1Id = await pendingOrders[0].getAttribute('data-order-id');
    const order2Id = await pendingOrders[1].getAttribute('data-order-id');

    if (!order1Id || !order2Id) {
      test.skip('Orders missing data-order-id attributes');
      return;
    }

    // Update different orders simultaneously
    const [r1, r2] = await Promise.allSettled([
      pageA.locator(`[data-testid="order-row-${order1Id}"] button:has-text("Mark Paid")`).click(),
      pageB.locator(`[data-testid="order-row-${order2Id}"] button:has-text("Mark Paid")`).click(),
    ]);

    // Both should succeed
    expect(r1.status).toBe('fulfilled');
    expect(r2.status).toBe('fulfilled');

    // Wait for UI updates
    await pageA.waitForTimeout(1000);
    await pageB.waitForTimeout(1000);

    // Both orders should now show "Paid" status
    const status1 = await pageA.locator(`[data-testid="order-row-${order1Id}"] [data-testid="status-badge"]`).textContent();
    const status2 = await pageB.locator(`[data-testid="order-row-${order2Id}"] [data-testid="status-badge"]`).textContent();
    
    expect(status1).toBe('Paid');
    expect(status2).toBe('Paid');

    await ctxA.close();
    await ctxB.close();
  });

  test('invalid status transitions are blocked', async ({ page }) => {
    await page.goto('/dashboard/orders');
    await page.waitForSelector('[data-testid="orders-table"]');

    // Find a completed order (should have no action buttons)
    const completedOrder = await page.locator('[data-testid="order-row"]').filter({ hasText: 'Completed' }).first();
    
    if (!(await completedOrder.count())) {
      test.skip('No completed orders available for testing');
      return;
    }

    // Completed orders should have no action buttons
    const actionButtons = await completedOrder.locator('button').count();
    expect(actionButtons).toBe(0);
  });
});
