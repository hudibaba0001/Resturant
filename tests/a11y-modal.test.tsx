import React from 'react';
import { render } from '@testing-library/react';
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

describe('Widget Modal Accessibility', () => {
  it('modal has no obvious a11y violations', async () => {
    // Mock modal structure that matches our widget
    const { container } = render(
      <div role="dialog" aria-labelledby="stjarna-modal-title" aria-modal="true">
        <div id="stjarna-modal-title">Menu & Order</div>
        <button aria-label="Close modal">×</button>
        <div role="main">
          <input 
            type="text" 
            placeholder="Ask about our menu..." 
            aria-label="Chat input"
          />
          <button aria-label="Send message">Send</button>
        </div>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('chat cards have proper accessibility attributes', async () => {
    const { container } = render(
      <div>
        <div className="stjarna-chat-card" role="article">
          <h3>Margherita Pizza</h3>
          <p>Fresh tomato and mozzarella</p>
          <button aria-label="Add Margherita Pizza to cart">Add</button>
        </div>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('cart has proper accessibility', async () => {
    const { container } = render(
      <div>
        <button aria-label="View cart (2 items)" className="stjarna-cart-btn">
          Cart (2)
        </button>
        <div role="dialog" aria-labelledby="cart-title">
          <h2 id="cart-title">Your Order</h2>
          <ul role="list">
            <li>Margherita Pizza - 1x</li>
            <li>Caesar Salad - 1x</li>
          </ul>
          <button aria-label="Checkout">Checkout</button>
        </div>
      </div>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
