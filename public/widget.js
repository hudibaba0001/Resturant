(function() {
  'use strict';

  // Configuration
  const WIDGET_VERSION = '1.0.0';
  let API_BASE = window.location.origin; // Will be set in init()
  
     // Design tokens (from our UI/UX Playbook)
   const tokens = {
     colors: {
       bg: '#FFFFFF',
       surface: '#FFFFFF',
       'surface-2': '#F8F9FA',
       border: '#E9ECEF',
       text: '#212529',
       'text-muted': '#6C757D',
       accent: '#007BFF',
       'accent-blue': '#4DA3FF',
       success: '#28A745',
       warning: '#FFC107',
       danger: '#DC3545'
     },
    spacing: {
      2: '2px', 4: '4px', 6: '6px', 8: '8px', 12: '12px',
      16: '16px', 20: '20px', 24: '24px', 32: '32px',
      40: '40px', 48: '48px'
    },
    borderRadius: {
      button: '9999px',
      input: '12px',
      card: '16px',
      modal: '20px'
    },
    shadows: {
      card: '0 6px 24px rgba(0,0,0,.25)',
      modal: '0 12px 32px rgba(0,0,0,.35)'
    },
    duration: {
      fast: '150ms',
      normal: '250ms'
    },
    easing: {
      smooth: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
    }
  };
  
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
    sessionToken: 'widget-' + Math.random().toString(36).substring(2, 15),
    conversationContext: null // Track conversation context
  };

  // Cart persistence helpers
  const CART_KEY = (id) => `stjarna:${id}:cart`;
  let lastFocused = null;

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

    // Set API base from script attribute or script origin
    API_BASE = script?.getAttribute('data-endpoint') ||
      (script?.src ? new URL(script.src).origin : window.location.origin);

    createWidget();
    restoreCart();
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
             <div class="stjarna-header-info">
               <h2 id="stjarna-modal-title">🍽️ Restaurant Menu</h2>
               <span class="stjarna-subtitle">Browse our menu and chat with our AI assistant</span>
               <span id="stjarna-modal-desc" class="sr-only">Browse menu, chat, and place orders.</span>
             </div>
            <div class="stjarna-header-actions">
              <button class="stjarna-cart-toggle" aria-label="View cart" tabindex="0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="9" cy="21" r="1"></circle>
                  <circle cx="20" cy="21" r="1"></circle>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
                </svg>
                <span class="stjarna-cart-count">0</span>
              </button>
              <button class="stjarna-close" aria-label="Close menu" tabindex="0">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
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
            <!-- Left Side: Menu -->
            <div class="stjarna-menu-section">
              <div class="stjarna-menu-header">
                <h3>📋 Our Menu</h3>
                <div class="stjarna-menu-filters">
                  <button class="stjarna-filter-btn active" data-category="all">All</button>
                  <button class="stjarna-filter-btn" data-category="Mains">Mains</button>
                  <button class="stjarna-filter-btn" data-category="Appetizers">Appetizers</button>
                  <button class="stjarna-filter-btn" data-category="Desserts">Desserts</button>
                  <button class="stjarna-filter-btn" data-category="Drinks">Drinks</button>
                </div>
              </div>
              <div class="stjarna-menu-grid" id="stjarna-menu-grid">
                <!-- Menu items will be loaded here -->
              </div>
            </div>
            
            <!-- Right Side: Chat -->
            <div class="stjarna-chat-section">
              <div class="stjarna-chat-header">
                <h3>💬 Ask Our AI Assistant</h3>
              </div>
              <div class="stjarna-chat-container">
                <div class="stjarna-chat-messages" aria-live="polite">
                  <div class="stjarna-welcome-message">
                    <div class="stjarna-avatar">🤖</div>
                    <div class="stjarna-message-content">
                      <p>Hi! I'm here to help. Ask me about ingredients, recommendations, or dietary preferences!</p>
                                             <div class="stjarna-quick-questions">
                         <button class="stjarna-quick-btn">"Indian food?"</button>
                         <button class="stjarna-quick-btn">"Italian dishes?"</button>
                         <button class="stjarna-quick-btn">"Vegan options?"</button>
                         <button class="stjarna-quick-btn">"What's popular?"</button>
                       </div>
                    </div>
                  </div>
                </div>
                
                <div class="stjarna-chat-input-container">
                  <div class="stjarna-chat-input">
                    <input type="text" placeholder="Ask about our menu..." aria-label="Ask about menu items">
                    <button type="submit" aria-label="Send message">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="22" y1="2" x2="11" y2="13"></line>
                        <polygon points="22,2 15,22 11,13 2,9"></polygon>
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Cart Modal (Hidden by default) -->
        <div class="stjarna-cart-modal" id="stjarna-cart-modal">
          <div class="stjarna-cart-content">
            <div class="stjarna-cart-header">
              <h3>🛒 Your Order</h3>
              <button class="stjarna-cart-close" aria-label="Close cart">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div class="stjarna-cart-body">
              <div class="stjarna-cart-items"></div>
              <div class="stjarna-cart-summary">
                <div class="stjarna-cart-total">
                  <span>Total:</span>
                  <span class="stjarna-total-amount">SEK 0.00</span>
                </div>
                <div class="stjarna-cart-actions">
                  <button class="stjarna-dine-in-btn" disabled>Get Dine-in Code</button>
                  <button class="stjarna-pickup-btn" disabled>Pickup & Pay</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    // Add styles using our design tokens
    const styles = document.createElement('style');
    styles.textContent = `
      #stjarna-fab {
        position: fixed;
        bottom: ${tokens.spacing[20]};
        right: ${tokens.spacing[20]};
        z-index: 9999;
        background: ${tokens.colors.accent};
        color: ${tokens.colors.bg};
        border: none;
        border-radius: ${tokens.borderRadius.button};
        padding: ${tokens.spacing[12]} ${tokens.spacing[20]};
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        box-shadow: ${tokens.shadows.card};
        display: flex;
        align-items: center;
        gap: ${tokens.spacing[8]};
        transition: all ${tokens.duration.normal} ${tokens.easing.smooth};
        min-height: 44px;
        min-width: 44px;
      }
      
      #stjarna-fab:hover {
        background: ${tokens.colors.accent}dd;
        transform: translateY(-2px);
        box-shadow: ${tokens.shadows.modal};
      }
      
      #stjarna-fab:focus {
        outline: none;
        box-shadow: 0 0 0 2px ${tokens.colors.accent}, ${tokens.shadows.card};
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
         background: ${tokens.colors.bg};
         width: 100%;
         height: 100%;
         display: flex;
         align-items: center;
         justify-content: center;
         padding: 0;
       }
       
       .stjarna-modal-content {
         background: ${tokens.colors.surface};
         border-radius: 0;
         width: 100%;
         height: 100%;
         max-width: none;
         max-height: none;
         display: flex;
         flex-direction: column;
         box-shadow: none;
         border: none;
       }
      
      .stjarna-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        padding: ${tokens.spacing[16]} ${tokens.spacing[20]};
        border-bottom: 1px solid ${tokens.colors.border};
      }
      
      .stjarna-header-info h2 {
        margin: 0 0 ${tokens.spacing[4]} 0;
        font-size: 18px;
        font-weight: 600;
        color: ${tokens.colors.text};
      }
      
      .stjarna-subtitle {
        font-size: 13px;
        color: ${tokens.colors['text-muted']};
        font-weight: 400;
      }
      
      .stjarna-header-actions {
        display: flex;
        align-items: center;
        gap: ${tokens.spacing[8]};
      }
      
      .stjarna-cart-toggle {
        background: none;
        border: none;
        cursor: pointer;
        padding: ${tokens.spacing[8]};
        border-radius: ${tokens.borderRadius.input};
        color: ${tokens.colors.text};
        transition: all ${tokens.duration.fast} ${tokens.easing.smooth};
        min-height: 44px;
        min-width: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
      }
      
      .stjarna-cart-toggle:hover {
        background: ${tokens.colors['surface-2']};
        color: ${tokens.colors.text};
      }
      
      .stjarna-cart-toggle:focus {
        outline: none;
        box-shadow: 0 0 0 2px ${tokens.colors.accent};
      }
      
      .stjarna-cart-count {
        position: absolute;
        top: 0;
        right: 0;
        background: ${tokens.colors.accent};
        color: ${tokens.colors.bg};
        border-radius: ${tokens.borderRadius.button};
        padding: ${tokens.spacing[4]} ${tokens.spacing[8]};
        font-size: 12px;
        font-weight: 600;
        min-width: 20px;
        text-align: center;
      }
      
      .stjarna-close {
        background: none;
        border: none;
        cursor: pointer;
        padding: ${tokens.spacing[8]};
        border-radius: ${tokens.borderRadius.input};
        color: ${tokens.colors['text-muted']};
        transition: all ${tokens.duration.fast} ${tokens.easing.smooth};
        min-height: 44px;
        min-width: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .stjarna-close:hover {
        background: ${tokens.colors['surface-2']};
        color: ${tokens.colors.text};
      }
      
      .stjarna-close:focus {
        outline: none;
        box-shadow: 0 0 0 2px ${tokens.colors.accent};
      }
      
      .stjarna-closed-banner {
        background: ${tokens.colors.danger}20;
        border: 1px solid ${tokens.colors.danger}40;
        border-radius: ${tokens.borderRadius.card};
        margin: ${tokens.spacing[16]} ${tokens.spacing[24]};
        padding: ${tokens.spacing[12]} ${tokens.spacing[16]};
      }
      
      .stjarna-closed-message {
        display: flex;
        align-items: center;
        gap: ${tokens.spacing[8]};
        color: ${tokens.colors.danger};
        font-weight: 500;
      }
      
             .stjarna-modal-body {
         display: flex;
         flex: 1;
         overflow: hidden;
       }
       
       .stjarna-menu-section {
         flex: 2;
         display: flex;
         flex-direction: column;
         border-right: 1px solid ${tokens.colors.border};
         min-width: 0;
       }
       
       .stjarna-chat-section {
         flex: 1;
         display: flex;
         flex-direction: column;
         min-width: 350px;
       }
      
      .stjarna-menu-header,
      .stjarna-chat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: ${tokens.spacing[16]} ${tokens.spacing[20]};
        border-bottom: 1px solid ${tokens.colors.border};
      }
      
      .stjarna-menu-header h3,
      .stjarna-chat-header h3 {
        margin: 0;
        font-size: 18px;
        font-weight: 600;
        color: ${tokens.colors.text};
      }
      
      .stjarna-menu-filters {
        display: flex;
        gap: ${tokens.spacing[8]};
        margin-left: ${tokens.spacing[12]};
      }
      
      .stjarna-filter-btn {
        padding: ${tokens.spacing[6]} ${tokens.spacing[12]};
        border: 1px solid ${tokens.colors.border};
        border-radius: ${tokens.borderRadius.button};
        background: ${tokens.colors.surface};
        color: ${tokens.colors.text};
        font-size: 12px;
        cursor: pointer;
        transition: all ${tokens.duration.fast} ${tokens.easing.smooth};
        min-height: 32px;
        font-weight: 500;
      }
      
      .stjarna-filter-btn:hover {
        background: ${tokens.colors['surface-2']};
        border-color: ${tokens.colors.accent};
      }
      
      .stjarna-filter-btn.active {
        background: ${tokens.colors.accent};
        color: ${tokens.colors.bg};
        border-color: ${tokens.colors.accent};
      }
      
      .stjarna-menu-grid {
        flex: 1;
        padding: ${tokens.spacing[16]} ${tokens.spacing[20]};
        overflow-y: auto;
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: ${tokens.spacing[16]};
      }
      
      .stjarna-menu-item {
        display: flex;
        flex-direction: column;
        padding: ${tokens.spacing[16]} ${tokens.spacing[20]};
        border: 1px solid ${tokens.colors.border};
        border-radius: ${tokens.borderRadius.card};
        background: ${tokens.colors.surface};
        transition: all ${tokens.duration.fast} ${tokens.easing.smooth};
        min-height: 120px;
      }
      
      .stjarna-menu-item:hover {
        border-color: ${tokens.colors.accent}40;
        box-shadow: ${tokens.shadows.card};
      }
      
      .stjarna-menu-item-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: ${tokens.spacing[8]};
      }
      
      .stjarna-menu-item-name {
        font-weight: 600;
        color: ${tokens.colors.text};
        font-size: 16px;
        margin: 0;
      }
      
      .stjarna-menu-item-price {
        font-weight: 600;
        color: ${tokens.colors.success};
        font-size: 16px;
      }
      
      .stjarna-menu-item-desc {
        margin: 0 0 ${tokens.spacing[12]} 0;
        font-size: 14px;
        color: ${tokens.colors['text-muted']};
        line-height: 1.4;
        flex: 1;
      }
      
      .stjarna-menu-item-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: auto;
      }
      
      .stjarna-menu-item-tags {
        display: flex;
        gap: ${tokens.spacing[6]};
        flex-wrap: wrap;
      }
      
      .stjarna-menu-tag {
        background: ${tokens.colors['surface-2']};
        color: ${tokens.colors['text-muted']};
        padding: ${tokens.spacing[4]} ${tokens.spacing[8]};
        border-radius: ${tokens.borderRadius.button};
        font-size: 11px;
        font-weight: 500;
        border: 1px solid ${tokens.colors.border};
      }
      
      .stjarna-chat-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: ${tokens.spacing[16]} ${tokens.spacing[20]};
      }
      
             .stjarna-chat-messages {
         flex: 1;
         padding: ${tokens.spacing[16]} ${tokens.spacing[20]};
         overflow-y: auto;
         display: flex;
         flex-direction: column;
         gap: ${tokens.spacing[8]};
         justify-content: flex-end;
         min-height: 0;
       }
      
      .stjarna-welcome-message {
        display: flex;
        align-items: center;
        gap: ${tokens.spacing[12]};
        padding: ${tokens.spacing[12]} ${tokens.spacing[16]};
        border-radius: ${tokens.borderRadius.card};
        background: ${tokens.colors['surface-2']};
        color: ${tokens.colors.text};
        border: 1px solid ${tokens.colors.border};
      }
      
      .stjarna-avatar {
        font-size: 24px;
        color: ${tokens.colors.accent};
      }
      
             .stjarna-message {
         margin-bottom: ${tokens.spacing[12]};
         padding: ${tokens.spacing[12]} ${tokens.spacing[16]};
         border-radius: ${tokens.borderRadius.card};
         max-width: 85%;
       }
       
       .stjarna-message.user {
         background: ${tokens.colors.accent}20;
         border: 1px solid ${tokens.colors.accent}40;
         margin-left: auto;
         color: ${tokens.colors.text};
       }
       
       .stjarna-message.assistant {
         background: ${tokens.colors['surface-2']};
         border: 1px solid ${tokens.colors.border};
         margin-right: auto;
         color: ${tokens.colors.text};
       }
       
       .stjarna-message-content {
         color: ${tokens.colors.text};
         font-size: 14px;
         line-height: 1.4;
       }
       
       .stjarna-message-content p {
         margin: 0;
         color: ${tokens.colors.text};
         font-size: 14px;
       }
      
      .stjarna-quick-questions {
        display: flex;
        gap: ${tokens.spacing[8]};
        margin-top: ${tokens.spacing[12]};
      }
      
      .stjarna-quick-btn {
        padding: ${tokens.spacing[6]} ${tokens.spacing[12]};
        border: 1px solid ${tokens.colors.border};
        border-radius: ${tokens.borderRadius.button};
        background: ${tokens.colors.surface};
        color: ${tokens.colors.text};
        font-size: 12px;
        cursor: pointer;
        transition: all ${tokens.duration.fast} ${tokens.easing.smooth};
        min-height: 32px;
        font-weight: 500;
      }
      
      .stjarna-quick-btn:hover {
        background: ${tokens.colors['surface-2']};
        border-color: ${tokens.colors.accent};
      }
      
      .stjarna-quick-btn:focus {
        outline: none;
        box-shadow: 0 0 0 2px ${tokens.colors.accent};
      }
      
      .stjarna-chat-input-container {
        padding: ${tokens.spacing[16]} ${tokens.spacing[20]};
        border-top: 1px solid ${tokens.colors.border};
      }
      
      .stjarna-chat-input {
        display: flex;
        gap: ${tokens.spacing[8]};
      }
      
      .stjarna-chat-input input {
        flex: 1;
        padding: ${tokens.spacing[10]} ${tokens.spacing[12]};
        border: 1px solid ${tokens.colors.border};
        border-radius: ${tokens.borderRadius.input};
        font-size: 14px;
        background: ${tokens.colors.surface};
        color: ${tokens.colors.text};
        transition: all ${tokens.duration.fast} ${tokens.easing.smooth};
        min-height: 40px;
      }
      
      .stjarna-chat-input input::placeholder {
        color: ${tokens.colors['text-muted']};
      }
      
      .stjarna-chat-input input:focus {
        outline: none;
        border-color: ${tokens.colors.accent};
        box-shadow: 0 0 0 2px ${tokens.colors.accent}40;
      }
      
      .stjarna-chat-input button {
        background: ${tokens.colors.accent};
        color: ${tokens.colors.bg};
        border: none;
        border-radius: ${tokens.borderRadius.input};
        padding: ${tokens.spacing[10]} ${tokens.spacing[12]};
        cursor: pointer;
        transition: all ${tokens.duration.fast} ${tokens.easing.smooth};
        min-height: 40px;
        min-width: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .stjarna-chat-input button:hover {
        background: ${tokens.colors.accent}dd;
      }
      
      .stjarna-chat-input button:focus {
        outline: none;
        box-shadow: 0 0 0 2px ${tokens.colors.accent};
      }
      
      .stjarna-cart-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        padding: ${tokens.spacing[16]} ${tokens.spacing[20]};
      }
      
      .stjarna-cart-items {
        flex: 1;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: ${tokens.spacing[12]};
        margin-bottom: ${tokens.spacing[16]};
      }
      
      .stjarna-cart-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: ${tokens.spacing[12]} ${tokens.spacing[16]};
        border: 1px solid ${tokens.colors.border};
        border-radius: ${tokens.borderRadius.card};
        background: ${tokens.colors.surface};
      }
      
      .stjarna-cart-item-name {
        font-weight: 600;
        color: ${tokens.colors.text};
        font-size: 14px;
      }
      
      .stjarna-cart-item-price {
        font-weight: 600;
        color: ${tokens.colors.success};
        font-size: 14px;
      }
      
      .stjarna-cart-item-quantity {
        font-size: 14px;
        color: ${tokens.colors['text-muted']};
      }
      
      .stjarna-cart-summary {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: ${tokens.spacing[16]};
        border-top: 1px solid ${tokens.colors.border};
      }
      
      .stjarna-cart-total {
        display: flex;
        align-items: baseline;
        gap: ${tokens.spacing[4]};
      }
      
      .stjarna-total-amount {
        font-weight: 600;
        font-size: 18px;
        color: ${tokens.colors.text};
      }
      
             .stjarna-cart-actions {
         display: flex;
         gap: ${tokens.spacing[8]};
       }
       
       .stjarna-dine-in-btn,
       .stjarna-pickup-btn {
         padding: ${tokens.spacing[6]} ${tokens.spacing[12]};
         border: 1px solid ${tokens.colors.border};
         border-radius: ${tokens.borderRadius.button};
         background: ${tokens.colors.surface};
         color: ${tokens.colors.text};
         font-size: 12px;
         cursor: pointer;
         transition: all ${tokens.duration.fast} ${tokens.easing.smooth};
         min-height: 32px;
         font-weight: 500;
       }
       
       /* Cart Modal Styles */
       .stjarna-cart-modal {
         position: fixed;
         top: 0;
         left: 0;
         width: 100%;
         height: 100%;
         z-index: 10001;
         display: none;
         background: rgba(0, 0, 0, 0.5);
       }
       
       .stjarna-cart-content {
         position: absolute;
         top: 50%;
         left: 50%;
         transform: translate(-50%, -50%);
         background: ${tokens.colors.surface};
         border-radius: ${tokens.borderRadius.modal};
         width: 90%;
         max-width: 500px;
         max-height: 80vh;
         display: flex;
         flex-direction: column;
         box-shadow: ${tokens.shadows.modal};
         border: 1px solid ${tokens.colors.border};
       }
       
       .stjarna-cart-header {
         display: flex;
         justify-content: space-between;
         align-items: center;
         padding: ${tokens.spacing[16]} ${tokens.spacing[20]};
         border-bottom: 1px solid ${tokens.colors.border};
       }
       
       .stjarna-cart-header h3 {
         margin: 0;
         font-size: 18px;
         font-weight: 600;
         color: ${tokens.colors.text};
       }
       
       .stjarna-cart-close {
         background: none;
         border: none;
         cursor: pointer;
         padding: ${tokens.spacing[8]};
         border-radius: ${tokens.borderRadius.input};
         color: ${tokens.colors['text-muted']};
         transition: all ${tokens.duration.fast} ${tokens.easing.smooth};
         min-height: 44px;
         min-width: 44px;
         display: flex;
         align-items: center;
         justify-content: center;
       }
       
       .stjarna-cart-close:hover {
         background: ${tokens.colors['surface-2']};
         color: ${tokens.colors.text};
       }
       
       .stjarna-cart-body {
         flex: 1;
         display: flex;
         flex-direction: column;
         overflow: hidden;
       }
       
       .stjarna-cart-items {
         flex: 1;
         overflow-y: auto;
         padding: ${tokens.spacing[16]} ${tokens.spacing[20]};
         display: flex;
         flex-direction: column;
         gap: ${tokens.spacing[12]};
       }
      
      .stjarna-dine-in-btn {
        background: ${tokens.colors.accent};
        color: ${tokens.colors.bg};
        border-color: ${tokens.colors.accent};
      }
      
      .stjarna-dine-in-btn:hover:not(:disabled) {
        background: ${tokens.colors.accent}dd;
      }
      
      .stjarna-pickup-btn:hover:not(:disabled) {
        background: ${tokens.colors['surface-2']};
        border-color: ${tokens.colors.accent};
      }
      
      .stjarna-dine-in-btn:focus,
      .stjarna-pickup-btn:focus {
        outline: none;
        box-shadow: 0 0 0 2px ${tokens.colors.accent};
      }
      
      .stjarna-dine-in-btn:disabled,
      .stjarna-pickup-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      .stjarna-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: ${tokens.spacing[20]};
        color: ${tokens.colors['text-muted']};
      }
      
             .stjarna-loading::after {
         content: '';
         width: 20px;
         height: 20px;
         border: 2px solid ${tokens.colors.border};
         border-top: 2px solid ${tokens.colors.accent};
         border-radius: 50%;
         animation: spin 1s linear infinite;
         margin-left: ${tokens.spacing[8]};
       }
       
       .sr-only {
         position: absolute;
         width: 1px;
         height: 1px;
         padding: 0;
         margin: -1px;
         overflow: hidden;
         clip: rect(0, 0, 0, 0);
         white-space: nowrap;
         border: 0;
       }
      
             .stjarna-chat-suggestions {
         display: flex;
         flex-direction: column;
         gap: ${tokens.spacing[12]};
       }
       
       .stjarna-suggestions-title {
         margin: 0 0 ${tokens.spacing[8]} 0;
         font-size: 14px;
         font-weight: 600;
         color: ${tokens.colors.text};
       }
       
       .stjarna-chat-cards {
         display: flex;
         flex-direction: column;
         gap: ${tokens.spacing[12]};
       }
       
       .stjarna-chat-card {
         border: 1px solid ${tokens.colors.border};
         border-radius: ${tokens.borderRadius.card};
         padding: ${tokens.spacing[16]} ${tokens.spacing[20]};
         background: ${tokens.colors.surface};
         box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
         transition: all ${tokens.duration.fast} ${tokens.easing.smooth};
       }
       
       .stjarna-chat-card:hover {
         border-color: ${tokens.colors.accent}40;
         box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
       }
       
       .stjarna-chat-card-header {
         display: flex;
         justify-content: space-between;
         align-items: flex-start;
         margin-bottom: ${tokens.spacing[8]};
       }
       
       .stjarna-chat-card-name {
         margin: 0;
         font-size: 16px;
         font-weight: 600;
         color: ${tokens.colors.text};
       }
       
       .stjarna-chat-card-price {
         font-weight: 600;
         color: ${tokens.colors.success};
         font-size: 16px;
       }
       
       .stjarna-chat-card-desc {
         margin: 0 0 ${tokens.spacing[12]} 0;
         font-size: 14px;
         color: ${tokens.colors['text-muted']};
         line-height: 1.4;
       }
       
       .stjarna-chat-card-tags {
         display: flex;
         gap: ${tokens.spacing[6]};
         flex-wrap: wrap;
         margin-bottom: ${tokens.spacing[12]};
       }
       
       .stjarna-chat-tag {
         background: ${tokens.colors['surface-2']};
         color: ${tokens.colors['text-muted']};
         padding: ${tokens.spacing[4]} ${tokens.spacing[8]};
         border-radius: ${tokens.borderRadius.button};
         font-size: 11px;
         font-weight: 500;
         border: 1px solid ${tokens.colors.border};
       }
       
       .stjarna-chat-add-btn {
         background: ${tokens.colors.accent};
         color: ${tokens.colors.bg};
         border: none;
         border-radius: ${tokens.borderRadius.button};
         padding: ${tokens.spacing[8]} ${tokens.spacing[16]};
         font-size: 14px;
         font-weight: 500;
         cursor: pointer;
         transition: all ${tokens.duration.fast} ${tokens.easing.smooth};
         width: 100%;
         min-height: 36px;
       }
       
       .stjarna-chat-add-btn:hover {
         background: ${tokens.colors.accent}dd;
         transform: translateY(-1px);
       }
       
       .stjarna-chat-add-btn:focus {
         outline: none;
         box-shadow: 0 0 0 2px ${tokens.colors.accent};
       }
      
      .stjarna-add-btn {
        background: ${tokens.colors.accent};
        color: ${tokens.colors.bg};
        border: none;
        border-radius: ${tokens.borderRadius.button};
        padding: ${tokens.spacing[6]} ${tokens.spacing[12]};
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all ${tokens.duration.fast} ${tokens.easing.smooth};
        width: 100%;
        min-height: 32px;
      }
      
      .stjarna-add-btn:hover {
        background: ${tokens.colors.accent}dd;
      }
      
      .stjarna-add-btn:focus {
        outline: none;
        box-shadow: 0 0 0 2px ${tokens.colors.accent};
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      
                       @media (max-width: 768px) {
           .stjarna-overlay {
             padding: 0;
           }
           
           .stjarna-modal-content {
             max-width: 100%;
             max-height: 100vh;
             border-radius: 0;
           }
           
           .stjarna-modal-body {
             flex-direction: column;
           }
           
           .stjarna-menu-section {
             border-right: none;
             border-bottom: 1px solid ${tokens.colors.border};
             min-height: 300px;
           }
           
           .stjarna-chat-section {
             min-height: 250px;
             min-width: auto;
           }
           
           .stjarna-cart-content {
             width: 95%;
             max-height: 90vh;
           }
          
          .stjarna-menu-grid {
            grid-template-columns: 1fr;
            gap: ${tokens.spacing[12]};
          }
          
          .stjarna-menu-filters {
            flex-wrap: wrap;
            gap: ${tokens.spacing[6]};
          }
          
          .stjarna-filter-btn {
            font-size: 11px;
            padding: ${tokens.spacing[4]} ${tokens.spacing[8]};
          }
          
          .stjarna-quick-questions {
            flex-direction: column;
            gap: ${tokens.spacing[6]};
          }
          
          .stjarna-quick-btn {
            width: 100%;
            text-align: center;
          }
          
          .stjarna-cart-actions {
            flex-direction: column;
            gap: ${tokens.spacing[6]};
          }
          
          .stjarna-dine-in-btn,
          .stjarna-pickup-btn {
            width: 100%;
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
       menuGrid: modal.querySelector('#stjarna-menu-grid'),
       chatMessages: modal.querySelector('.stjarna-chat-messages'),
       chatInput: modal.querySelector('.stjarna-chat-input input'),
       chatSubmit: modal.querySelector('.stjarna-chat-input button'),
       cartToggle: modal.querySelector('.stjarna-cart-toggle'),
       cartModal: modal.querySelector('#stjarna-cart-modal'),
       cartClose: modal.querySelector('.stjarna-cart-close'),
       cartItems: modal.querySelector('.stjarna-cart-items'),
       cartCount: modal.querySelector('.stjarna-cart-count'),
       cartTotal: modal.querySelector('.stjarna-total-amount'),
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
     elements.cartToggle.addEventListener('click', openCart);
     elements.cartClose.addEventListener('click', closeCart);
     elements.cartModal.addEventListener('click', (e) => {
       if (e.target === elements.cartModal) closeCart();
     });
     elements.dineInBtn.addEventListener('click', () => createOrder('dine_in'));
     elements.pickupBtn.addEventListener('click', () => createOrder('pickup'));

    // Quick question buttons
    const quickBtns = modal.querySelectorAll('.stjarna-quick-btn');
    quickBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const question = btn.textContent.replace(/"/g, '');
        elements.chatInput.value = question;
        sendMessage();
      });
    });

    // Menu filter buttons
    const filterBtns = modal.querySelectorAll('.stjarna-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        // Remove active class from all buttons
        filterBtns.forEach(b => b.classList.remove('active'));
        // Add active class to clicked button
        btn.classList.add('active');
        
        const category = btn.getAttribute('data-category');
        filterMenuItems(category);
      });
    });

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
      renderMenuItems();
    } catch (error) {
      console.error('Failed to load menu:', error);
    }
  }

  // Open modal
  function openModal() {
    lastFocused = document.activeElement;
    state.isOpen = true;
    elements.modal.style.display = 'block';
    
    // Set ARIA attributes
    elements.modal.querySelector('.stjarna-modal-content')
      .setAttribute('aria-modal', 'true');
    elements.modal.querySelector('.stjarna-modal-content')
      .setAttribute('aria-describedby', 'stjarna-modal-desc');
    
    elements.chatInput.focus();
    
    // Focus trap - attach once
    if (!elements._trapHandler) {
      elements._trapHandler = function(e) {
        if (e.key === 'Tab') {
          const focusableElements = elements.modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];
          
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
      };
    }
    elements.modal.addEventListener('keydown', elements._trapHandler);
  }

  // Close modal
  function closeModal() {
    state.isOpen = false;
    elements.modal.style.display = 'none';
    
    // Clean up event listeners
    if (elements._trapHandler) {
      elements.modal.removeEventListener('keydown', elements._trapHandler);
    }
    
    // Return focus to last focused element
    if (lastFocused && lastFocused.focus) {
      lastFocused.focus();
    }
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
      
      // Use server reply first, fallback to intelligent response
      if (data.reply) {
        addMessage('assistant', data.reply);
      } else {
        const intelligentResponse = provideIntelligentResponse(message);
        addMessage('assistant', intelligentResponse);
      }
      
      // If API suggests specific items, show them as cards
      if (Array.isArray(data.suggestions) && data.suggestions.length > 0) {
        state.suggestions = data.suggestions;
        renderSuggestions();
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Fallback: provide intelligent responses
      const intelligentResponse = provideIntelligentResponse(message);
      addMessage('assistant', intelligentResponse);
    } finally {
      state.isLoading = false;
      elements.chatSubmit.disabled = false;
    }
  }

  // Provide intelligent AI responses
  function provideIntelligentResponse(message) {
    if (!state.menu) return "I'm sorry, I don't have access to the menu right now. Please try again later.";
    
    const allItems = state.menu.flatMap(section => section.items);
    const lowerMessage = message.toLowerCase();
    
    // Handle conversation context first
    if (state.conversationContext) {
      if (lowerMessage.includes('yes') || lowerMessage.includes('sure') || lowerMessage.includes('ok') || lowerMessage.includes('please')) {
        // Follow up on previous context
        if (state.conversationContext === 'vegan_followup') {
          state.conversationContext = 'vegetarian_shown';
          return provideVegetarianOptions(allItems);
        } else if (state.conversationContext === 'gluten_followup') {
          state.conversationContext = null;
          return provideGlutenFreeOptions(allItems);
        } else if (state.conversationContext === 'spicy_followup') {
          state.conversationContext = null;
          return provideSpicyOptions(allItems);
        } else if (state.conversationContext === 'budget_followup') {
          state.conversationContext = null;
          return provideBudgetOptions(allItems);
        }
      } else if (state.conversationContext === 'vegetarian_shown' && 
                (lowerMessage.includes('vegan') || lowerMessage.includes('how') || lowerMessage.includes('make'))) {
        // User is asking about making vegetarian dishes vegan
        state.conversationContext = null;
        return provideVeganModifications(allItems);
      } else if (lowerMessage.includes('vegan') || lowerMessage.includes('vegetarian') || 
                lowerMessage.includes('gluten') || lowerMessage.includes('spicy') || 
                lowerMessage.includes('budget') || lowerMessage.includes('cheap')) {
        // User is asking about a different dietary preference, clear context
        state.conversationContext = null;
      } else {
        // Keep context for other follow-up questions
        // Don't clear context here
      }
    }
    
    // Cuisine-specific responses with detailed dish information
    if (lowerMessage.includes('indian') || lowerMessage.includes('india')) {
      const indianItems = allItems.filter(item => 
        item.description?.toLowerCase().includes('indian') ||
        item.name.toLowerCase().includes('curry') ||
        item.name.toLowerCase().includes('tikka') ||
        item.name.toLowerCase().includes('biryani') ||
        item.name.toLowerCase().includes('naan') ||
        item.name.toLowerCase().includes('dal') ||
        item.name.toLowerCase().includes('paneer')
      );
      
      if (indianItems.length > 0) {
        let response = "Yes, we have a wonderful selection of Indian dishes! Here are some highlights:\n\n";
        
        indianItems.slice(0, 3).forEach(item => {
          const price = (item.price_cents || (item.price ? Math.round(item.price * 100) : 0)) / 100;
          response += `• **${item.name}** - SEK ${price.toFixed(2)}\n`;
          
          // Add detailed descriptions based on dish type
          if (item.name.toLowerCase().includes('butter chicken')) {
            response += `  A classic North Indian dish with tender chicken in a rich, creamy tomato-based sauce. Made with aromatic spices like garam masala, turmeric, and fenugreek. Served with basmati rice and naan bread.\n\n`;
          } else if (item.name.toLowerCase().includes('paneer')) {
            response += `  Fresh Indian cottage cheese cooked with spinach and aromatic spices. A traditional vegetarian dish rich in protein and flavor. Made with fresh spinach, paneer cheese, and a blend of Indian spices.\n\n`;
          } else if (item.name.toLowerCase().includes('curry')) {
            response += `  Aromatic curry prepared with authentic Indian spices. Each curry is carefully crafted with a unique blend of spices including cumin, coriander, turmeric, and chili.\n\n`;
          } else {
            response += `  ${item.description || 'A delicious Indian dish prepared with authentic spices and traditional cooking methods.'}\n\n`;
          }
        });
        
        response += "Would you like me to tell you more about any specific dish or show you our complete Indian menu?";
        return response;
      }
    }
    
    if (lowerMessage.includes('italian') || lowerMessage.includes('pizza') || lowerMessage.includes('pasta')) {
      const italianItems = allItems.filter(item => 
        item.description?.toLowerCase().includes('italian') ||
        item.name.toLowerCase().includes('pizza') ||
        item.name.toLowerCase().includes('pasta') ||
        item.name.toLowerCase().includes('risotto') ||
        item.name.toLowerCase().includes('bruschetta')
      );
      
      if (italianItems.length > 0) {
        let response = "Absolutely! We have authentic Italian cuisine. Here are some of our Italian specialties:\n\n";
        
        italianItems.slice(0, 3).forEach(item => {
          const price = (item.price_cents || (item.price ? Math.round(item.price * 100) : 0)) / 100;
          response += `• **${item.name}** - SEK ${price.toFixed(2)}\n`;
          
          if (item.name.toLowerCase().includes('pizza')) {
            response += `  Traditional Italian pizza with hand-tossed dough, fresh mozzarella, and authentic tomato sauce. Cooked in a stone oven for that perfect crispy crust.\n\n`;
          } else if (item.name.toLowerCase().includes('pasta')) {
            response += `  Al dente pasta prepared with fresh ingredients and traditional Italian sauces. Each pasta dish is made to order with authentic Italian cooking techniques.\n\n`;
          } else {
            response += `  ${item.description || 'A classic Italian dish prepared with fresh ingredients and traditional recipes.'}\n\n`;
          }
        });
        
        response += "Would you like to know more about any specific Italian dish?";
        return response;
      }
    }
    
    if (lowerMessage.includes('chinese') || lowerMessage.includes('asian')) {
      const chineseItems = allItems.filter(item => 
        item.description?.toLowerCase().includes('chinese') ||
        item.name.toLowerCase().includes('noodle') ||
        item.name.toLowerCase().includes('rice') ||
        item.name.toLowerCase().includes('stir fry') ||
        item.name.toLowerCase().includes('dumpling')
      );
      
      if (chineseItems.length > 0) {
        let response = "Yes! We have delicious Chinese and Asian cuisine. Here are some highlights:\n\n";
        
        chineseItems.slice(0, 3).forEach(item => {
          const price = (item.price_cents || (item.price ? Math.round(item.price * 100) : 0)) / 100;
          response += `• **${item.name}** - SEK ${price.toFixed(2)}\n`;
          
          if (item.name.toLowerCase().includes('noodle')) {
            response += `  Fresh Asian noodles stir-fried with vegetables and your choice of protein. Prepared in a traditional wok with authentic Asian sauces and spices.\n\n`;
          } else if (item.name.toLowerCase().includes('rice')) {
            response += `  Fragrant jasmine rice cooked with fresh vegetables and aromatic Asian spices. A perfect accompaniment to any Asian dish.\n\n`;
          } else {
            response += `  ${item.description || 'A traditional Asian dish prepared with authentic ingredients and cooking methods.'}\n\n`;
          }
        });
        
        response += "Would you like to know more about any specific Asian dish?";
        return response;
      }
    }
    
    if (lowerMessage.includes('mexican') || lowerMessage.includes('taco') || lowerMessage.includes('burrito')) {
      const mexicanItems = allItems.filter(item => 
        item.description?.toLowerCase().includes('mexican') ||
        item.name.toLowerCase().includes('taco') ||
        item.name.toLowerCase().includes('burrito') ||
        item.name.toLowerCase().includes('quesadilla') ||
        item.name.toLowerCase().includes('guacamole')
      );
      
      if (mexicanItems.length > 0) {
        let response = "¡Sí! We have authentic Mexican cuisine. Here are some of our Mexican favorites:\n\n";
        
        mexicanItems.slice(0, 3).forEach(item => {
          const price = (item.price_cents || (item.price ? Math.round(item.price * 100) : 0)) / 100;
          response += `• **${item.name}** - SEK ${price.toFixed(2)}\n`;
          
          if (item.name.toLowerCase().includes('taco')) {
            response += `  Fresh corn tortillas filled with your choice of protein, topped with fresh salsa, guacamole, and Mexican spices. Served with lime and cilantro.\n\n`;
          } else if (item.name.toLowerCase().includes('burrito')) {
            response += `  Large flour tortilla wrapped around rice, beans, meat, and fresh vegetables. Topped with melted cheese and served with sour cream and salsa.\n\n`;
          } else {
            response += `  ${item.description || 'A traditional Mexican dish prepared with authentic spices and fresh ingredients.'}\n\n`;
          }
        });
        
        response += "Would you like to know more about any specific Mexican dish?";
        return response;
      }
    }
    
    // Dietary preferences
         if (lowerMessage.includes('vegan') || lowerMessage.includes('plant-based')) {
       const veganItems = allItems.filter(item => 
         item.description?.toLowerCase().includes('vegan') || 
         item.allergens?.some(allergen => allergen.toLowerCase() === 'vegan')
       );
       if (veganItems.length > 0) {
         let response = `Great! I found ${veganItems.length} vegan options for you. Here are some highlights:\n\n`;
         
         veganItems.slice(0, 3).forEach(item => {
           const price = (item.price_cents || (item.price ? Math.round(item.price * 100) : 0)) / 100;
           response += `• **${item.name}** - SEK ${price.toFixed(2)}\n`;
           response += `  ${item.description || 'A delicious plant-based dish made with fresh, organic ingredients.'}\n\n`;
         });
         
         response += "All our vegan dishes are carefully prepared with plant-based ingredients and no animal products.";
         return response;
       } else {
         state.conversationContext = 'vegan_followup';
         return "I don't see any specifically marked vegan items on our menu, but many of our vegetarian dishes can be made vegan-friendly. Would you like me to show you our vegetarian options?";
       }
     }
    
    if (lowerMessage.includes('vegetarian') || lowerMessage.includes('veg')) {
      const vegItems = allItems.filter(item => 
        item.description?.toLowerCase().includes('vegetarian') || 
        item.category === 'Appetizers' || 
        item.category === 'Desserts'
      );
      
      let response = `I found ${vegItems.length} vegetarian-friendly options! Here are some highlights:\n\n`;
      
      vegItems.slice(0, 3).forEach(item => {
        const price = (item.price_cents || (item.price ? Math.round(item.price * 100) : 0)) / 100;
        response += `• **${item.name}** - SEK ${price.toFixed(2)}\n`;
        response += `  ${item.description || 'A delicious vegetarian dish made with fresh vegetables and wholesome ingredients.'}\n\n`;
      });
      
      response += "We have a good selection of appetizers, desserts, and main dishes that are vegetarian.";
      return response;
    }
    
         if (lowerMessage.includes('gluten') || lowerMessage.includes('celiac')) {
       const glutenFreeItems = allItems.filter(item => 
         item.description?.toLowerCase().includes('gluten-free') || 
         item.allergens?.some(allergen => allergen.toLowerCase() === 'gluten-free')
       );
       if (glutenFreeItems.length > 0) {
         let response = `Perfect! I found ${glutenFreeItems.length} gluten-free options. Here are some highlights:\n\n`;
         
         glutenFreeItems.slice(0, 3).forEach(item => {
           const price = (item.price_cents || (item.price ? Math.round(item.price * 100) : 0)) / 100;
           response += `• **${item.name}** - SEK ${price.toFixed(2)}\n`;
           response += `  ${item.description || 'A delicious gluten-free dish prepared with safe ingredients.'}\n\n`;
         });
         
         response += "We take food allergies seriously and these dishes are prepared with gluten-free ingredients in a dedicated area.";
         return response;
       } else {
         state.conversationContext = 'gluten_followup';
         return "I don't see any specifically marked gluten-free items, but I can help you identify dishes that might be naturally gluten-free. Would you like me to check the ingredients?";
       }
     }
    
         // Spicy food
     if (lowerMessage.includes('spicy') || lowerMessage.includes('hot')) {
       const spicyItems = allItems.filter(item => 
         item.description?.toLowerCase().includes('spicy') || 
         item.description?.toLowerCase().includes('chili') ||
         item.name.toLowerCase().includes('spicy')
       );
       if (spicyItems.length > 0) {
         let response = `🔥 I found ${spicyItems.length} spicy dishes! Here are some of our hottest options:\n\n`;
         
         spicyItems.slice(0, 3).forEach(item => {
           const price = (item.price_cents || (item.price ? Math.round(item.price * 100) : 0)) / 100;
           response += `• **${item.name}** - SEK ${price.toFixed(2)}\n`;
           response += `  ${item.description || 'A spicy dish with varying heat levels to suit your taste.'}\n\n`;
         });
         
         response += "We have some great options with varying heat levels. Would you like me to show you the spicy selections?";
         return response;
       } else {
         state.conversationContext = 'spicy_followup';
         return "We have some dishes that can be made spicy upon request! Many of our main courses can be adjusted to your preferred heat level. Would you like me to show you our main courses that can be made spicy?";
       }
     }
    
    // Popular/recommended
    if (lowerMessage.includes('popular') || lowerMessage.includes('best') || lowerMessage.includes('recommend')) {
      const popularCategories = ['Mains', 'Appetizers'];
      const popularItems = allItems.filter(item => popularCategories.includes(item.category));
      
      let response = `Based on our menu, I'd recommend trying our main courses - they're our most popular items! Here are some highlights:\n\n`;
      
      popularItems.slice(0, 3).forEach(item => {
        const price = (item.price_cents || (item.price ? Math.round(item.price * 100) : 0)) / 100;
        response += `• **${item.name}** - SEK ${price.toFixed(2)}\n`;
        response += `  ${item.description || 'A popular dish loved by our customers.'}\n\n`;
      });
      
      response += `We have ${popularItems.length} great options across different cuisines. Would you like me to show you more?`;
      return response;
    }
    
    // Desserts
    if (lowerMessage.includes('dessert') || lowerMessage.includes('sweet')) {
      const desserts = allItems.filter(item => item.category === 'Desserts');
      if (desserts.length > 0) {
        let response = `🍰 We have ${desserts.length} delicious dessert options! Here are some sweet treats:\n\n`;
        
        desserts.slice(0, 3).forEach(item => {
          const price = (item.price_cents || (item.price ? Math.round(item.price * 100) : 0)) / 100;
          response += `• **${item.name}** - SEK ${price.toFixed(2)}\n`;
          response += `  ${item.description || 'A delicious dessert to satisfy your sweet tooth.'}\n\n`;
        });
        
        response += "From traditional favorites to unique creations, we have something to satisfy your sweet tooth.";
        return response;
      } else {
        return "We have some sweet options available! While we don't have a dedicated dessert section, some of our main dishes have sweet elements. What type of dessert are you looking for?";
      }
    }
    
    // Drinks
    if (lowerMessage.includes('drink') || lowerMessage.includes('beverage')) {
      const drinks = allItems.filter(item => item.category === 'Drinks');
      if (drinks.length > 0) {
        let response = `🥤 We have ${drinks.length} refreshing drink options! Here are some beverages:\n\n`;
        
        drinks.slice(0, 3).forEach(item => {
          const price = (item.price_cents || (item.price ? Math.round(item.price * 100) : 0)) / 100;
          response += `• **${item.name}** - SEK ${price.toFixed(2)}\n`;
          response += `  ${item.description || 'A refreshing beverage to complement your meal.'}\n\n`;
        });
        
        response += "From soft drinks to specialty beverages, we have something for everyone.";
        return response;
      } else {
        return "We offer a variety of beverages to complement your meal! While we don't have a separate drinks section, we can provide recommendations based on your food choices. What are you planning to order?";
      }
    }
    
         // Price-related
     if (lowerMessage.includes('cheap') || lowerMessage.includes('budget') || lowerMessage.includes('affordable')) {
       const affordableItems = allItems.filter(item => {
         const price = item.price_cents || (item.price ? Math.round(item.price * 100) : 0);
         return price < 15000; // Less than 150 SEK
       });
       
       if (affordableItems.length > 0) {
         let response = `💰 I found ${affordableItems.length} budget-friendly options under 150 SEK! Here are some great value dishes:\n\n`;
         
         affordableItems.slice(0, 6).forEach(item => {
           const price = (item.price_cents || (item.price ? Math.round(item.price * 100) : 0)) / 100;
           response += `• **${item.name}** - SEK ${price.toFixed(2)}\n`;
           
           // Add detailed descriptions based on dish type
           if (item.name.toLowerCase().includes('lemonade')) {
             response += `  Freshly squeezed lemonade made with real lemons, a perfect refreshing drink. Served over ice with a slice of lemon for garnish.\n\n`;
           } else if (item.name.toLowerCase().includes('hummus')) {
             response += `  Creamy chickpea hummus served with warm pita bread and fresh vegetables. Made with tahini, olive oil, and authentic Middle Eastern spices.\n\n`;
           } else if (item.name.toLowerCase().includes('bruschetta')) {
             response += `  Traditional Italian bruschetta with toasted bread topped with fresh tomatoes, basil, garlic, and extra virgin olive oil. A classic appetizer.\n\n`;
           } else if (item.name.toLowerCase().includes('smoothie')) {
             response += `  Fresh fruit smoothie blended with natural ingredients. A healthy and delicious beverage perfect for any time of day.\n\n`;
           } else if (item.name.toLowerCase().includes('latte')) {
             response += `  Premium green tea latte made with matcha powder and steamed milk. A healthy alternative to coffee with natural antioxidants.\n\n`;
           } else if (item.name.toLowerCase().includes('mousse')) {
             response += `  Rich and creamy vegan chocolate mousse made with dark chocolate and coconut cream. A decadent dessert that's also dairy-free.\n\n`;
           } else if (item.name.toLowerCase().includes('tiramisu')) {
             response += `  Classic Italian tiramisu with layers of coffee-soaked ladyfingers and mascarpone cream. Topped with cocoa powder for the perfect finish.\n\n`;
           } else if (item.name.toLowerCase().includes('cake')) {
             response += `  Warm chocolate lava cake with a molten center, served with vanilla ice cream. A chocolate lover's dream dessert.\n\n`;
           } else if (item.name.toLowerCase().includes('rolls')) {
             response += `  Fresh spring rolls filled with crisp vegetables and herbs, served with sweet chili dipping sauce. A light and healthy appetizer.\n\n`;
           } else {
             response += `  ${item.description || 'A delicious and affordable dish that offers great value without compromising on taste or quality.'}\n\n`;
           }
         });
         
         response += "These budget-friendly options provide excellent value while maintaining the quality and taste you expect from our restaurant.";
         return response;
       } else {
         state.conversationContext = 'budget_followup';
         return "I don't see many budget-friendly options under 150 SEK, but I can show you our most affordable dishes. Would you like me to show you our lower-priced options?";
       }
     }
    
    // General help
    if (lowerMessage.includes('help') || lowerMessage.includes('what') || lowerMessage.includes('how')) {
      return "I'm here to help! I can assist you with:\n• Finding dishes based on dietary preferences (vegan, vegetarian, gluten-free)\n• Recommending popular or spicy options\n• Suggesting budget-friendly choices\n• Explaining ingredients and allergens\n• Providing detailed information about specific cuisines (Indian, Italian, Chinese, Mexican)\n\nWhat would you like to know about our menu?";
    }
    
       // Default response
   return "I'd be happy to help you find the perfect dish! I can assist with dietary preferences, recommendations, or answer questions about our menu. What are you looking for today?";
 }

 // Helper functions for follow-up responses
 function provideVegetarianOptions(allItems) {
   const vegItems = allItems.filter(item => 
     item.description?.toLowerCase().includes('vegetarian') || 
     item.category === 'Appetizers' || 
     item.category === 'Desserts' ||
     item.name.toLowerCase().includes('paneer') ||
     item.name.toLowerCase().includes('dal') ||
     item.name.toLowerCase().includes('hummus') ||
     item.name.toLowerCase().includes('bruschetta')
   );
   
   let response = `Great! Here are our vegetarian-friendly options:\n\n`;
   
   vegItems.slice(0, 5).forEach(item => {
     const price = (item.price_cents || (item.price ? Math.round(item.price * 100) : 0)) / 100;
     response += `• **${item.name}** - SEK ${price.toFixed(2)}\n`;
     
     if (item.name.toLowerCase().includes('paneer')) {
       response += `  Fresh Indian cottage cheese cooked with spinach and aromatic spices. A traditional vegetarian dish rich in protein and flavor.\n\n`;
     } else if (item.name.toLowerCase().includes('dal')) {
       response += `  Traditional Indian lentil curry, rich in protein and fiber. Made with aromatic spices and served with rice or bread.\n\n`;
     } else if (item.name.toLowerCase().includes('hummus')) {
       response += `  Creamy chickpea hummus served with warm pita bread and fresh vegetables. Made with tahini, olive oil, and authentic Middle Eastern spices.\n\n`;
     } else if (item.name.toLowerCase().includes('bruschetta')) {
       response += `  Traditional Italian bruschetta with toasted bread topped with fresh tomatoes, basil, garlic, and extra virgin olive oil.\n\n`;
     } else {
       response += `  ${item.description || 'A delicious vegetarian dish made with fresh vegetables and wholesome ingredients.'}\n\n`;
     }
   });
   
   response += "These dishes are all vegetarian and many can be made vegan-friendly upon request. Would you like me to tell you more about any specific dish?";
   return response;
 }

 function provideGlutenFreeOptions(allItems) {
   const glutenFreeItems = allItems.filter(item => 
     item.description?.toLowerCase().includes('gluten-free') || 
     item.allergens?.some(allergen => allergen.toLowerCase() === 'gluten-free') ||
     item.name.toLowerCase().includes('rice') ||
     item.name.toLowerCase().includes('smoothie') ||
     item.name.toLowerCase().includes('lemonade') ||
     item.name.toLowerCase().includes('latte')
   );
   
   let response = `Here are some dishes that are naturally gluten-free or can be made gluten-free:\n\n`;
   
   glutenFreeItems.slice(0, 5).forEach(item => {
     const price = (item.price_cents || (item.price ? Math.round(item.price * 100) : 0)) / 100;
     response += `• **${item.name}** - SEK ${price.toFixed(2)}\n`;
     response += `  ${item.description || 'A dish that can be prepared gluten-free upon request.'}\n\n`;
   });
   
   response += "We can also modify many of our other dishes to be gluten-free. Just let us know about your dietary requirements when ordering!";
   return response;
 }

 function provideSpicyOptions(allItems) {
   const mainCourses = allItems.filter(item => item.category === 'Mains');
   
   let response = `Here are our main courses that can be made spicy upon request:\n\n`;
   
   mainCourses.slice(0, 5).forEach(item => {
     const price = (item.price_cents || (item.price ? Math.round(item.price * 100) : 0)) / 100;
     response += `• **${item.name}** - SEK ${price.toFixed(2)}\n`;
     response += `  ${item.description || 'A delicious main course that can be customized to your preferred heat level.'}\n\n`;
   });
   
   response += "Just let us know your preferred spice level when ordering - mild, medium, hot, or extra hot!";
   return response;
 }

   function provideBudgetOptions(allItems) {
    const affordableItems = allItems.filter(item => {
      const price = item.price_cents || (item.price ? Math.round(item.price * 100) : 0);
      return price < 20000; // Less than 200 SEK
    }).sort((a, b) => {
      const priceA = a.price_cents || (a.price ? Math.round(a.price * 100) : 0);
      const priceB = b.price_cents || (b.price ? Math.round(b.price * 100) : 0);
      return priceA - priceB;
    });
    
    let response = `Here are our most affordable options:\n\n`;
    
    affordableItems.slice(0, 5).forEach(item => {
      const price = (item.price_cents || (item.price ? Math.round(item.price * 100) : 0)) / 100;
      response += `• **${item.name}** - SEK ${price.toFixed(2)}\n`;
      response += `  ${item.description || 'A great value dish that offers excellent taste and quality.'}\n\n`;
    });
    
    response += "These are our most budget-friendly options while still maintaining the quality you expect!";
    return response;
  }

  function provideVeganModifications(allItems) {
    let response = `Great question! Here's how our vegetarian dishes can be made vegan-friendly:\n\n`;
    
    response += `**🌱 Vegan Modifications Available:**\n\n`;
    
    response += `• **Palak Paneer** → **Palak Tofu**\n`;
    response += `  Replace paneer (Indian cottage cheese) with firm tofu. The spinach gravy remains the same with aromatic spices. Tofu absorbs the flavors beautifully and provides similar protein content.\n\n`;
    
    response += `• **Hummus Plate** → **Already Vegan!**\n`;
    response += `  Our hummus is naturally vegan - made with chickpeas, tahini, olive oil, and spices. Served with fresh vegetables and warm pita bread.\n\n`;
    
    response += `• **Bruschetta** → **Vegan Bruschetta**\n`;
    response += `  Remove any cheese and use extra virgin olive oil, fresh tomatoes, basil, and garlic. The bread can be toasted without butter.\n\n`;
    
    response += `• **Spring Rolls** → **Already Vegan!**\n`;
    response += `  Our fresh spring rolls are naturally vegan with crisp vegetables, herbs, and rice paper wrappers.\n\n`;
    
    response += `**💡 General Vegan Substitutions:**\n`;
    response += `• Cheese → Nutritional yeast or vegan cheese alternatives\n`;
    response += `• Butter → Olive oil or vegan butter\n`;
    response += `• Cream → Coconut cream or cashew cream\n`;
    response += `• Yogurt → Coconut yogurt or soy yogurt\n\n`;
    
    response += `Just let us know when ordering that you'd like the vegan version, and we'll make the necessary substitutions! Would you like me to show you any specific vegan modifications?`;
    
    return response;
  }

  // Add message to chat
  function addMessage(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `stjarna-message ${type}`;
    messageDiv.innerHTML = `<div class="stjarna-message-content">${escapeHtml(content)}</div>`;
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  }

  // Render menu items in the grid
  function renderMenuItems() {
    if (!state.menu || state.menu.length === 0) return;
    
    const allItems = state.menu.flatMap(section => section.items);
    if (allItems.length === 0) return;
    
    const menuHtml = allItems.map(item => `
      <div class="stjarna-menu-item" data-category="${escapeHtml(item.category || 'Mains')}">
        <div class="stjarna-menu-item-header">
          <h4 class="stjarna-menu-item-name">${escapeHtml(item.name)}</h4>
          <span class="stjarna-menu-item-price">${formatPrice(item)}</span>
        </div>
        ${item.description ? `<p class="stjarna-menu-item-desc">${escapeHtml(item.description)}</p>` : ''}
        <div class="stjarna-menu-item-actions">
          ${item.allergens && item.allergens.length > 0 ? `
            <div class="stjarna-menu-item-tags">
              ${item.allergens.map(tag => `<span class="stjarna-menu-tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
          ` : ''}
          <button class="stjarna-add-btn" onclick="addToCart('${item.id}')" aria-label="Add ${escapeHtml(item.name)} to cart">
            Add to cart
          </button>
        </div>
      </div>
    `).join('');
    
    elements.menuGrid.innerHTML = menuHtml;
  }
  
     // Filter menu items by category
   function filterMenuItems(category) {
     const menuItems = elements.menuGrid.querySelectorAll('.stjarna-menu-item');
     
     // Remove "Suggested" filter button if switching to other categories
     if (category !== 'suggested') {
       const suggestedBtn = document.querySelector('.stjarna-filter-btn[data-category="suggested"]');
       if (suggestedBtn) {
         suggestedBtn.remove();
       }
     }
     
     menuItems.forEach(item => {
       const itemCategory = item.getAttribute('data-category');
       if (category === 'all' || itemCategory === category) {
         item.style.display = 'block';
         item.style.opacity = '1';
       } else {
         item.style.display = 'none';
       }
     });
   }
  
     // Render suggestions as dedicated cards in chat
   function renderSuggestions() {
     const items = state.suggestions.length > 0 ? state.suggestions : 
                   (state.menu ? state.menu.flatMap(section => section.items) : []);
     
     if (items.length === 0) return;

     // Add suggestions as chat message with cards
     const suggestionsHtml = items.map(item => `
       <div class="stjarna-chat-card">
         <div class="stjarna-chat-card-header">
           <h4 class="stjarna-chat-card-name">${escapeHtml(item.name)}</h4>
           <span class="stjarna-chat-card-price">${formatPrice(item)}</span>
         </div>
         ${item.description ? `<p class="stjarna-chat-card-desc">${escapeHtml(item.description)}</p>` : ''}
         ${item.allergens && item.allergens.length > 0 ? `
           <div class="stjarna-chat-card-tags">
             ${item.allergens.map(tag => `<span class="stjarna-chat-tag">${escapeHtml(tag)}</span>`).join('')}
           </div>
         ` : ''}
         <button class="stjarna-chat-add-btn" onclick="addToCart('${item.id}')" aria-label="Add ${escapeHtml(item.name)} to cart">
           Add to cart
         </button>
       </div>
     `).join('');

     const messageDiv = document.createElement('div');
     messageDiv.className = 'stjarna-message assistant';
     messageDiv.innerHTML = `
       <div class="stjarna-chat-suggestions">
         <p class="stjarna-suggestions-title">Here are some options for you:</p>
         <div class="stjarna-chat-cards">
           ${suggestionsHtml}
         </div>
       </div>
     `;
     elements.chatMessages.appendChild(messageDiv);
     elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
     
     // Also filter the menu to show only suggested items
     filterMenuToSuggestions(items);
   }
   
   // Filter menu to show only suggested items
   function filterMenuToSuggestions(suggestedItems) {
     const menuItems = elements.menuGrid.querySelectorAll('.stjarna-menu-item');
     const suggestedIds = suggestedItems.map(item => item.id);
     
     menuItems.forEach(item => {
       const itemId = item.querySelector('.stjarna-add-btn').getAttribute('onclick').match(/'([^']+)'/)[1];
       if (suggestedIds.includes(itemId)) {
         item.style.display = 'block';
         item.style.opacity = '1';
       } else {
         item.style.display = 'none';
       }
     });
     
     // Update filter button to show "Suggested"
     const filterBtns = document.querySelectorAll('.stjarna-filter-btn');
     filterBtns.forEach(btn => btn.classList.remove('active'));
     
     // Create or update "Suggested" filter button
     let suggestedBtn = document.querySelector('.stjarna-filter-btn[data-category="suggested"]');
     if (!suggestedBtn) {
       suggestedBtn = document.createElement('button');
       suggestedBtn.className = 'stjarna-filter-btn active';
       suggestedBtn.setAttribute('data-category', 'suggested');
       suggestedBtn.textContent = 'Suggested';
       document.querySelector('.stjarna-menu-filters').appendChild(suggestedBtn);
       
       // Add event listener
       suggestedBtn.addEventListener('click', () => {
         filterBtns.forEach(b => b.classList.remove('active'));
         suggestedBtn.classList.add('active');
         filterMenuToSuggestions(suggestedItems);
       });
     } else {
       suggestedBtn.classList.add('active');
     }
   }

  // Cart persistence functions
  function restoreCart() {
    try {
      state.cart = JSON.parse(localStorage.getItem(CART_KEY(state.restaurantId)) || '[]');
    } catch (e) {
      state.cart = [];
    }
    updateCart();
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

     // Open cart modal
   function openCart() {
     elements.cartModal.style.display = 'block';
   }
   
   // Close cart modal
   function closeCart() {
     elements.cartModal.style.display = 'none';
   }
   
   // Update cart display
   function updateCart() {
     const total = state.cart.reduce((sum, item) => sum + (item.price_cents * item.quantity), 0);
     elements.cartTotal.textContent = `SEK ${(total / 100).toFixed(2)}`;
     elements.cartCount.textContent = state.cart.length;
     
     // Render cart items
     elements.cartItems.innerHTML = state.cart.map(item => `
       <div class="stjarna-cart-item">
         <div class="stjarna-cart-item-info">
           <div class="stjarna-cart-item-name">${escapeHtml(item.name)}</div>
           <div class="stjarna-cart-item-quantity">Qty: ${item.quantity}</div>
         </div>
         <div class="stjarna-cart-item-price">SEK ${(item.price_cents / 100).toFixed(2)}</div>
       </div>
     `).join('');
     
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
    const currency = item.currency || 'SEK';
    const cents = item.price_cents ?? Math.round((item.price || 0) * 100);
    return new Intl.NumberFormat('sv-SE', { style: 'currency', currency }).format(cents / 100);
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
