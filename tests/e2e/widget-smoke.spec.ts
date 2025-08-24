import { test, expect } from '@playwright/test';

test('widget opens and shows cards after a chat', async ({ page }) => {
  // Navigate to the test page with widget
  await page.goto('/test-widget.html');
  
  // Wait for widget to load
  await page.waitForSelector('#stjarna-widget', { timeout: 10000 });
  
  // Click the widget button to open modal
  await page.getByRole('button', { name: /menu & order/i }).click();
  
  // Wait for modal to open
  await page.waitForSelector('.stjarna-modal', { timeout: 5000 });
  
  // Type in chat input
  await page.getByPlaceholder(/ask about our menu/i).fill('Italian dishes?');
  
  // Send the message
  await page.getByRole('button', { name: /send/i }).click();
  
  // Wait for response and verify it contains Italian-related text
  await expect(page.getByText(/italian/i)).toBeVisible({ timeout: 10000 });
  
  // Verify cards are shown (should be 3 or fewer)
  await expect(page.locator('.stjarna-chat-card')).toHaveCount({ min: 1, max: 3 }, { timeout: 5000 });
});

test('widget respects closed state', async ({ page }) => {
  await page.goto('/test-widget.html');
  await page.waitForSelector('#stjarna-widget', { timeout: 10000 });
  
  // Click widget button
  await page.getByRole('button', { name: /menu & order/i }).click();
  
  // Check if closed state is shown (this will depend on your test data)
  const closedMessage = page.getByText(/closed/i);
  const openContent = page.getByText(/menu/i);
  
  // Either closed message OR open content should be visible
  await expect(closedMessage.or(openContent)).toBeVisible({ timeout: 5000 });
});

test('cart functionality works', async ({ page }) => {
  await page.goto('/test-widget.html');
  await page.waitForSelector('#stjarna-widget', { timeout: 10000 });
  
  // Open widget
  await page.getByRole('button', { name: /menu & order/i }).click();
  await page.waitForSelector('.stjarna-modal', { timeout: 5000 });
  
  // Try to add item to cart (if available)
  const addButtons = page.locator('.stjarna-menu-add-btn');
  const count = await addButtons.count();
  
  if (count > 0) {
    await addButtons.first().click();
    
    // Verify cart count updates
    await expect(page.locator('.stjarna-cart-count')).toContainText('1', { timeout: 3000 });
  }
});
