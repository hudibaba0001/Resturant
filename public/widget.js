(function() {
  'use strict';

  // Configuration
  const WIDGET_VERSION = '1.0.0';
  const API_BASE = window.location.origin;
  
  // State management
  let state = {
    restaurantId: null,
    isOpen: false,
    isClosed: false,
    isLoading: false,
    cart: [],
    chatHistory: [],
    suggestions: [],
    menu: null,
    sessionToken: 'widget-' + Math.random().toString(36).substring(2, 15)
  };

  // DOM elements
  let elements = {};

  // Initialize widget
  function init() {
    const script = document.currentScript;
    state.restaurantId = script.getAttribute('data-restaurant');
    
    if (!state.restaurantId) {
      console.error('Stjarna Widget: Missing data-restaurant attribute');
      return;
    }

    createWidget();
    checkRestaurantStatus();
    loadMenu();
    
    // Fire telemetry
    if (window.plausible) {
      window.plausible('widget_open');
    }
  }

  // Create widget DOM
  function createWidget() {
    // Create FAB button
    const fab = document.createElement('button');
    fab.id = 'stjarna-fab';
    fab.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span>Menu & Order</span>
    `;
    fab.setAttribute('aria-label', 'Open restaurant menu and ordering');
    fab.addEventListener('click', openModal);

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'stjarna-modal';
    modal.innerHTML = `
      <div class="stjarna-overlay" tabindex="-1">
        <div class="stjarna-modal-content" role="dialog" aria-labelledby="stjarna-modal-title">
          <div class="stjarna-modal-header">
            <h2 id="stjarna-modal-title">Restaurant Menu</h2>
            <button class="stjarna-close" aria-label="Close menu" tabindex="0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
          
          <div class="stjarna-closed-banner" style="display: none;">
            <div class="stjarna-closed-message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
              <span>We're currently closed</span>
            </div>
          </div>
          
          <div class="stjarna-modal-body">
            <div class="stjarna-chat-section">
              <div class="stjarna-chat-header">
                <h3>Ask about our menu</h3>
              </div>
              <div class="stjarna-chat-messages" aria-live="polite"></div>
              <div class="stjarna-chat-input">
                <input type="text" placeholder="e.g., 'vegan options?'" aria-label="Ask about menu items">
                <button type="submit" aria-label="Send message">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <line x1="22" y1="2" x2="11" y2="13"></line>
                    <polygon points="22,2 15,22 11,13 2,9"></polygon>
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="stjarna-suggestions-section">
              <div class="stjarna-suggestions-header">
                <h3>Menu Items</h3>
                <div class="stjarna-cart-summary">
                  <span class="stjarna-cart-total">SEK 0.00</span>
                  <div class="stjarna-cart-actions">
                    <button class="stjarna-dine-in-btn" disabled>Dine-in code</button>
                    <button class="stjarna-pickup-btn" disabled>Pickup & Pay</button>
                  </div>
                </div>
              </div>
              <div class="stjarna-suggestions-list"></div>
              <div class="stjarna-empty-suggestions" style="display: none;">
                <p>Ask about our menu to see suggestions!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add styles
    const styles = document.createElement('style');
    styles.textContent = `
      #stjarna-fab {
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 9999;
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 50px;
        padding: 12px 20px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
      }
      
      #stjarna-fab:hover {
        background: #1d4ed8;
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0,0,0,0.2);
      }
      
      #stjarna-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        display: none;
      }
      
      .stjarna-overlay {
        background: rgba(0,0,0,0.5);
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
      }
      
      .stjarna-modal-content {
        background: white;
        border-radius: 12px;
        width: 100%;
        max-width: 900px;
        max-height: 80vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 40px rgba(0,0,0,0.2);
      }
      
      .stjarna-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px 24px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .stjarna-modal-header h2 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: #111827;
      }
      
      .stjarna-close {
        background: none;
        border: none;
        cursor: pointer;
        padding: 8px;
        border-radius: 6px;
        color: #6b7280;
        transition: all 0.2s ease;
      }
      
      .stjarna-close:hover {
        background: #f3f4f6;
        color: #374151;
      }
      
      .stjarna-closed-banner {
        background: #fef2f2;
        border: 1px solid #fecaca;
        border-radius: 8px;
        margin: 16px 24px;
        padding: 12px 16px;
      }
      
      .stjarna-closed-message {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #dc2626;
        font-weight: 500;
      }
      
      .stjarna-modal-body {
        display: flex;
        flex: 1;
        overflow: hidden;
      }
      
      .stjarna-chat-section {
        flex: 1;
        border-right: 1px solid #e5e7eb;
        display: flex;
        flex-direction: column;
      }
      
      .stjarna-chat-header {
        padding: 16px 20px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .stjarna-chat-header h3 {
        margin: 0;
        font-size: 16px;
        font-weight: 600;
        color: #111827;
      }
      
      .stjarna-chat-messages {
        flex: 1;
        padding: 16px 20px;
        overflow-y: auto;
        max-height: 300px;
      }
      
      .stjarna-message {
        margin-bottom: 12px;
        padding: 12px 16px;
        border-radius: 12px;
        max-width: 80%;
      }
      
      .stjarna-message.user {
        background: #2563eb;
        color: white;
        margin-left: auto;
      }
      
      .stjarna-message.assistant {
        background: #f3f4f6;
        color: #111827;
      }
      
      .stjarna-chat-input {
        padding: 16px 20px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        gap: 8px;
      }
      
      .stjarna-chat-input input {
        flex: 1;
        padding: 10px 12px;
        border: 1px solid #d1d5db;
        border-radius: 8px;
        font-size: 14px;
      }
      
      .stjarna-chat-input button {
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 8px;
        padding: 10px 12px;
        cursor: pointer;
        transition: background 0.2s ease;
      }
      
      .stjarna-chat-input button:hover {
        background: #1d4ed8;
      }
      
      .stjarna-suggestions-section {
        flex: 1;
        display: flex;
        flex-direction: column;
      }
      
      .stjarna-suggestions-header {
        padding: 16px 20px;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .stjarna-suggestions-header h3 {
        margin: 0 0 12px 0;
        font-size: 16px;
        font-weight: 600;
        color: #111827;
      }
      
      .stjarna-cart-summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .stjarna-cart-total {
        font-weight: 600;
        color: #111827;
      }
      
      .stjarna-cart-actions {
        display: flex;
        gap: 8px;
      }
      
      .stjarna-dine-in-btn,
      .stjarna-pickup-btn {
        padding: 6px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        background: white;
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .stjarna-dine-in-btn:hover:not(:disabled),
      .stjarna-pickup-btn:hover:not(:disabled) {
        background: #f9fafb;
        border-color: #9ca3af;
      }
      
      .stjarna-dine-in-btn:disabled,
      .stjarna-pickup-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .stjarna-suggestions-list {
        flex: 1;
        padding: 16px 20px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .stjarna-item-card {
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 16px;
        background: white;
      }
      
      .stjarna-item-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
      }
      
      .stjarna-item-name {
        font-weight: 600;
        color: #111827;
        margin: 0;
      }
      
      .stjarna-item-price {
        font-weight: 600;
        color: #059669;
      }
      
      .stjarna-item-description {
        color: #6b7280;
        font-size: 14px;
        margin-bottom: 12px;
        line-height: 1.4;
      }
      
      .stjarna-item-tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 12px;
      }
      
      .stjarna-tag {
        background: #f3f4f6;
        color: #374151;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 500;
      }
      
      .stjarna-add-btn {
        background: #2563eb;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 8px 16px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background 0.2s ease;
        width: 100%;
      }
      
      .stjarna-add-btn:hover {
        background: #1d4ed8;
      }
      
      .stjarna-empty-suggestions {
        text-align: center;
        color: #6b7280;
        padding: 40px 20px;
      }
      
      .stjarna-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        color: #6b7280;
      }
      
      .stjarna-loading::after {
        content: '';
        width: 20px;
        height: 20px;
        border: 2px solid #e5e7eb;
        border-top: 2px solid #2563eb;
        border-radius: 50%;
        animation: spin 1s linear infinite;
        margin-left: 8px;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
      @media (max-width: 768px) {
        .stjarna-modal-content {
          max-width: 100%;
          max-height: 100vh;
          border-radius: 0;
        }
        
        .stjarna-modal-body {
          flex-direction: column;
        }
        
        .stjarna-chat-section {
          border-right: none;
          border-bottom: 1px solid #e5e7eb;
        }
      }
    `;

    // Add to page
    document.head.appendChild(styles);
    document.body.appendChild(fab);
    document.body.appendChild(modal);

    // Store elements
    elements = {
      fab,
      modal,
      overlay: modal.querySelector('.stjarna-overlay'),
      closeBtn: modal.querySelector('.stjarna-close'),
      closedBanner: modal.querySelector('.stjarna-closed-banner'),
      chatMessages: modal.querySelector('.stjarna-chat-messages'),
      chatInput: modal.querySelector('.stjarna-chat-input input'),
      chatSubmit: modal.querySelector('.stjarna-chat-input button'),
      suggestionsList: modal.querySelector('.stjarna-suggestions-list'),
      emptySuggestions: modal.querySelector('.stjarna-empty-suggestions'),
      cartTotal: modal.querySelector('.stjarna-cart-total'),
      dineInBtn: modal.querySelector('.stjarna-dine-in-btn'),
      pickupBtn: modal.querySelector('.stjarna-pickup-btn')
    };

    // Event listeners
    elements.closeBtn.addEventListener('click', closeModal);
    elements.overlay.addEventListener('click', (e) => {
      if (e.target === elements.overlay) closeModal();
    });
    elements.chatSubmit.addEventListener('click', sendMessage);
    elements.chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage();
    });
    elements.dineInBtn.addEventListener('click', () => createOrder('dine_in'));
    elements.pickupBtn.addEventListener('click', () => createOrder('pickup'));

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && state.isOpen) {
        closeModal();
      }
    });
  }

  // Check restaurant status
  async function checkRestaurantStatus() {
    try {
      const response = await fetch(`${API_BASE}/api/public/status?restaurantId=${state.restaurantId}`);
      const data = await response.json();
      
      state.isClosed = !data.open;
      if (state.isClosed) {
        elements.closedBanner.style.display = 'block';
      }
    } catch (error) {
      console.error('Failed to check restaurant status:', error);
    }
  }

  // Load menu
  async function loadMenu() {
    try {
      const response = await fetch(`${API_BASE}/api/public/menu?restaurantId=${state.restaurantId}`);
      const data = await response.json();
      
      state.menu = data.sections;
      renderSuggestions();
    } catch (error) {
      console.error('Failed to load menu:', error);
    }
  }

  // Open modal
  function openModal() {
    state.isOpen = true;
    elements.modal.style.display = 'block';
    elements.chatInput.focus();
    
    // Focus trap
    const focusableElements = elements.modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    elements.modal.addEventListener('keydown', function(e) {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    });
  }

  // Close modal
  function closeModal() {
    state.isOpen = false;
    elements.modal.style.display = 'none';
  }

  // Send chat message
  async function sendMessage() {
    const message = elements.chatInput.value.trim();
    if (!message) return;

    // Add user message
    addMessage('user', message);
    elements.chatInput.value = '';

    // Show loading
    state.isLoading = true;
    elements.chatSubmit.disabled = true;

    try {
      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: state.restaurantId,
          sessionToken: state.sessionToken,
          message: message
        })
      });

      const data = await response.json();
      
      if (data.response) {
        addMessage('assistant', data.response);
      }
      
      if (data.suggestions && data.suggestions.length > 0) {
        state.suggestions = data.suggestions;
        renderSuggestions();
      }
    } catch (error) {
      console.error('Chat error:', error);
      addMessage('assistant', 'Sorry, I\'m having trouble right now. Please try again.');
    } finally {
      state.isLoading = false;
      elements.chatSubmit.disabled = false;
    }
  }

  // Add message to chat
  function addMessage(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `stjarna-message ${type}`;
    messageDiv.textContent = content;
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  }

  // Render suggestions
  function renderSuggestions() {
    const items = state.suggestions.length > 0 ? state.suggestions : 
                  (state.menu ? state.menu.flatMap(section => section.items) : []);
    
    if (items.length === 0) {
      elements.suggestionsList.style.display = 'none';
      elements.emptySuggestions.style.display = 'block';
      return;
    }

    elements.suggestionsList.style.display = 'flex';
    elements.emptySuggestions.style.display = 'none';
    
    elements.suggestionsList.innerHTML = items.map(item => `
      <div class="stjarna-item-card">
        <div class="stjarna-item-header">
          <h4 class="stjarna-item-name">${escapeHtml(item.name)}</h4>
          <span class="stjarna-item-price">${formatPrice(item)}</span>
        </div>
        ${item.description ? `<p class="stjarna-item-description">${escapeHtml(item.description)}</p>` : ''}
        ${item.allergens && item.allergens.length > 0 ? `
          <div class="stjarna-item-tags">
            ${item.allergens.map(tag => `<span class="stjarna-tag">${escapeHtml(tag)}</span>`).join('')}
          </div>
        ` : ''}
        <button class="stjarna-add-btn" onclick="addToCart('${item.id}')" aria-label="Add ${escapeHtml(item.name)} to cart">
          Add to cart
        </button>
      </div>
    `).join('');
  }

  // Add to cart
  function addToCart(itemId) {
    const item = [...state.suggestions, ...(state.menu ? state.menu.flatMap(section => section.items) : [])]
      .find(item => item.id === itemId);
    
    if (!item) return;

    const existingItem = state.cart.find(cartItem => cartItem.id === itemId);
    if (existingItem) {
      existingItem.quantity += 1;
    } else {
      state.cart.push({
        id: itemId,
        name: item.name,
        price_cents: item.price_cents || (item.price ? Math.round(item.price * 100) : 0),
        quantity: 1
      });
    }

    updateCart();
    
    // Fire telemetry
    if (window.plausible) {
      window.plausible('add_to_cart', { props: { itemId } });
    }
  }

  // Update cart display
  function updateCart() {
    const total = state.cart.reduce((sum, item) => sum + (item.price_cents * item.quantity), 0);
    elements.cartTotal.textContent = `SEK ${(total / 100).toFixed(2)}`;
    
    const hasItems = state.cart.length > 0;
    elements.dineInBtn.disabled = !hasItems || state.isClosed;
    elements.pickupBtn.disabled = !hasItems || state.isClosed;
  }

  // Create order
  async function createOrder(type) {
    if (state.cart.length === 0) return;

    // Fire telemetry
    if (window.plausible) {
      window.plausible('checkout_start', { props: { type } });
    }

    try {
      const response = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId: state.restaurantId,
          sessionToken: state.sessionToken,
          type: type,
          items: state.cart.map(item => ({
            itemId: item.id,
            qty: item.quantity
          }))
        })
      });

      const data = await response.json();
      
      if (type === 'dine_in' && data.orderCode) {
        alert(`Your order code is: ${data.orderCode}`);
        state.cart = [];
        updateCart();
      } else if (type === 'pickup' && data.checkoutUrl) {
        window.open(data.checkoutUrl, '_blank');
      } else {
        throw new Error(data.error || 'Order failed');
      }
    } catch (error) {
      console.error('Order error:', error);
      alert('Sorry, there was an error creating your order. Please try again.');
    }
  }

  // Utility functions
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function formatPrice(item) {
    const priceCents = item.price_cents || (item.price ? Math.round(item.price * 100) : 0);
    const currency = item.currency || 'SEK';
    return `${currency} ${(priceCents / 100).toFixed(2)}`;
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose addToCart globally for onclick handlers
  window.addToCart = addToCart;
})();
