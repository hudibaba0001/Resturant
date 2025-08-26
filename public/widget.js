(function() {
  'use strict';

  // Configuration
  const WIDGET_VERSION = '1.0.0';
  let API_BASE = window.location.origin; // Will be set in init()
  
  // Telemetry wrapper (never throws)
  function track(name, props = {}) {
    try { 
      window.plausible && window.plausible(name, { props }); 
    } catch (e) {
      // Silently fail - don't break widget for telemetry
    }
  }
  
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
  const state = {
    restaurantId: null,
    isOpen: false,
    isClosed: false,
    isLoading: false,
    cart: [],
    chatHistory: [],
    suggestions: [],
    menu: null,
    sessionToken: null,
    conversationContext: null, // Track conversation context
    lastIntent: null,
    _lastAssistantText: '',
    _lastChipsKey: ''
  };

  // Cart persistence helpers
  const CART_KEY = (id) => `stjarna:${id}:cart`;
  let lastFocused = null;

  // Smart chat helpers
  const GENERIC_HELP =
    "I can help with cuisines, dietary needs, or budget. What are you looking for?";

  const GLOSSARY = {
    tofu:
      "Tofu is a soy-based protein with a mild flavor that absorbs sauces; it's vegan.",
    paneer:
      "Paneer is a fresh Indian cheese; mild, doesn't melt; vegetarian (contains dairy).",
    gluten:
      "Gluten is a protein in wheat/barley/rye. If you have celiac, choose gluten-free items.",
    vegan:
      "Vegan = no animal products (no meat, fish, dairy, eggs, honey).",
    vegetarian:
      "Vegetarian = no meat/fish; dairy and eggs may be included.",
  };

  function detectIntent(q) {
    if (/\bvegan|plant[- ]?based\b/i.test(q)) return "vegan";
    if (/\bvegetarian|veg-only|veg\b/i.test(q)) return "vegetarian";
    if (/\bgluten\b/i.test(q)) return "gluten";
    if (/\bspicy|hot\b/i.test(q)) return "spicy";
    if (/\bbudget|cheap|affordable\b/i.test(q)) return "budget";
    if (/\bpizza\b/i.test(q)) return "pizza";
    if (/\bindian\b/i.test(q)) return "indian";
    if (/\bitalian|pasta|risotto|bruschetta\b/i.test(q)) return "italian";
    if (/\bmexican|taco|burrito|quesadilla\b/i.test(q)) return "mexican";
    if (/\bpopular|recommend|best\b/i.test(q)) return "popular";
    if (/\bwhat(?:'| i)?s\s+([a-z]+)/i.test(q)) return "glossary";
    return "unknown";
  }

  function pickCards(items, n = 3) {
    return (items || []).slice(0, n);
  }

  function sameText(a = "", b = "") {
    return a.trim().toLowerCase() === b.trim().toLowerCase();
  }

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
    // For development, use localhost if the script is loaded from localhost
    const scriptOrigin = script?.src ? new URL(script.src).origin : window.location.origin;
    API_BASE = script?.getAttribute('data-endpoint') || scriptOrigin;
    
    // For development, always use localhost if we're on localhost
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      API_BASE = 'http://localhost:3000';
    }

    // Persist session token for stable chat threads
    const key = `stjarna:${state.restaurantId}:session`;
    state.sessionToken = sessionStorage.getItem(key)
      || `widget-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem(key, state.sessionToken);

    createWidget();
    restoreCart();
    checkRestaurantStatus();
    loadMenu();
    
    // Fire telemetry
    track('widget_open');
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
                <div class="stjarna-chat-messages" role="log" aria-live="polite" aria-relevant="additions">
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
          overflow: hidden; /* keep content inside */
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
         overflow: hidden; /* critical for sticky input */
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
        
        .stjarna-context {
          margin-top: 4px;
          font-size: 12px;
          color: ${tokens.colors['text-muted']};
        }
        
        .stjarna-disclaimer {
          margin-top: 8px;
          font-size: 11px;
          color: ${tokens.colors['text-muted']};
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
         position: sticky;
         bottom: 0;
         background: ${tokens.colors.surface};
         z-index: 1;
       }
      
             .stjarna-chat-input {
         display: flex;
         gap: ${tokens.spacing[8]};
         align-items: center;
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
         min-width: 0; /* Allow input to shrink */
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
         padding: ${tokens.spacing[8]};
         cursor: pointer;
         transition: all ${tokens.duration.fast} ${tokens.easing.smooth};
         min-height: 40px;
         min-width: 40px;
         max-width: 40px;
         flex-shrink: 0; /* Prevent button from shrinking */
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
            height: 100vh;
            border-radius: 0;
          }
          
          .stjarna-menu-grid {
            contain: content;
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
           
           .stjarna-chat-input {
             gap: ${tokens.spacing[6]};
           }
           
           .stjarna-chat-input input {
             font-size: 13px;
             padding: ${tokens.spacing[8]} ${tokens.spacing[10]};
           }
           
           .stjarna-chat-input button {
             min-width: 36px;
             max-width: 36px;
             min-height: 36px;
             padding: ${tokens.spacing[6]};
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
        
                 /* Apply closed-state globally */
         .stjarna-closed .stjarna-add-btn {
           opacity: 0.5;
           pointer-events: none;
         }
         /* Cover chat suggestion cards as well */
         .stjarna-closed .stjarna-chat-add-btn {
           opacity: 0.5;
           pointer-events: none;
         }
         
         @media (prefers-reduced-motion: reduce) {
           * { animation: none !important; transition: none !important; }
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
           elements.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !state.isLoading) sendMessage();
      });
     elements.cartToggle.addEventListener('click', openCart);
     elements.cartClose.addEventListener('click', closeCart);
     elements.cartModal.addEventListener('click', (e) => {
       if (e.target === elements.cartModal) closeCart();
     });
           elements.dineInBtn.addEventListener('click', () => createOrder('dine_in'));
      elements.pickupBtn.addEventListener('click', () => createOrder('pickup'));

    // Event delegation for add to cart buttons
    elements.menuGrid.addEventListener('click', (e) => {
      const btn = e.target.closest('.stjarna-add-btn');
      if (!btn) return;
      const id = btn.dataset?.id;
      if (!id) return;
      addToCart(id);
    });

    // Event delegation for chat add to cart buttons
    elements.chatMessages.addEventListener('click', (e) => {
      const btn = e.target.closest('.stjarna-chat-add-btn');
      if (!btn) return;
      const id = btn.dataset?.id;
      if (!id) return;
      addToCart(id);
    });

    // Quick question buttons
    const quickBtns = modal.querySelectorAll('.stjarna-quick-btn');
    quickBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const question = btn.textContent.replace(/"/g, '');
        elements.chatInput.value = question;
        sendMessage();
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
       const response = await fetch(`${API_BASE}/api/public/status?restaurantId=${state.restaurantId}`, {
         headers: { 'X-Widget-Version': WIDGET_VERSION }
       });
       if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      state.isClosed = !data.open;
      if (state.isClosed) {
        elements.closedBanner.style.display = 'block';
        if (elements.dineInBtn) elements.dineInBtn.disabled = true;
        if (elements.pickupBtn) elements.pickupBtn.disabled = true;
        // Apply closed styling to the whole modal so chat cards are covered too
        elements.modal.classList.add('stjarna-closed');
      }
    } catch (error) {
      console.error('Failed to check restaurant status:', error);
    }
  }

  // Load menu
  async function loadMenu() {
         try {
       const response = await fetch(`${API_BASE}/api/public/menu?restaurantId=${state.restaurantId}`, {
         headers: { 'X-Widget-Version': WIDGET_VERSION }
       });
       if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      state.menu = data.sections;
      buildFilters();
      renderMenuItems();
    } catch (error) {
      console.error('Failed to load menu:', error);
    }
  }

  // Build dynamic category filters
  function buildFilters() {
    if (!Array.isArray(state.menu)) return;
    const cats = new Set(
      state.menu.flatMap(s => (s.items || []).map(i => i.category || 'Other'))
    );
    const bar = document.querySelector('.stjarna-menu-filters');
    if (!bar) return;
    bar.innerHTML = `<button class="stjarna-filter-btn active" data-category="all">All</button>` +
      [...cats].map(c => `<button class="stjarna-filter-btn" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join('');
    
    // Rebind filter events
    const filterBtns = bar.querySelectorAll('.stjarna-filter-btn');
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        
        const category = btn.getAttribute('data-category');
        filterMenuItems(category);
      });
    });
  }

  // Open modal
  function openModal() {
    lastFocused = document.activeElement;
    state.isOpen = true;
    elements.modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    
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
        if (!focusableElements.length) return;
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
     
     // Remove any existing listener before adding new one
     elements.modal.removeEventListener('keydown', elements._trapHandler);
     elements.modal.addEventListener('keydown', elements._trapHandler);
  }

  // Close modal
  function closeModal() {
    state.isOpen = false;
    elements.modal.style.display = 'none';
    document.body.style.overflow = '';
    
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

    console.log('[WIDGET DEBUG] sendMessage called with:', message);
    console.log('[WIDGET DEBUG] API_BASE:', API_BASE);
    console.log('[WIDGET DEBUG] restaurantId:', state.restaurantId);
    console.log('[WIDGET DEBUG] sessionToken:', state.sessionToken);

    // Add user message
    addMessage('user', message);
    elements.chatInput.value = '';

    // Track chat interaction
    track('chat_ask', { q: message.slice(0, 80) });

    try {
      // de-dupe fast Enter clicks
      if (state.isLoading) return;
      // Show loading (after the guard)
      state.isLoading = true;
      elements.chatSubmit.disabled = true;
      
      console.log('[WIDGET DEBUG] Making API call to:', `${API_BASE}/api/chat`);
      console.log('[WIDGET DEBUG] Request payload:', {
        restaurantId: state.restaurantId,
        sessionToken: state.sessionToken,
        message: message
      });
      
      const requestBody = JSON.stringify({
        restaurantId: state.restaurantId,
        sessionToken: state.sessionToken,
        message: message
      });
      
      console.log('[WIDGET DEBUG] Request body stringified:', requestBody);
      
      console.log('[WIDGET DEBUG] About to make fetch call...');
      let response;
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 6000);
        
        response = await fetch(`${API_BASE}/api/chat`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Widget-Version': WIDGET_VERSION
          },
          body: requestBody,
          signal: controller.signal
        });
        clearTimeout(timer);
        
        console.log('[WIDGET DEBUG] Fetch call completed successfully');
      } catch (fetchError) {
        console.error('[WIDGET DEBUG] Fetch call failed:', fetchError);
        throw fetchError;
      }
      
      console.log('[WIDGET DEBUG] Response status:', response.status);
      console.log('[WIDGET DEBUG] Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      console.log('[WIDGET DEBUG] Response data:', data);
      
      // Use server reply first, fallback to intelligent response
      if (data.reply?.text) {
        console.log('[WIDGET DEBUG] Adding assistant reply:', data.reply.text);
        addAssistantReply(data.reply);
      } else {
        console.log('[WIDGET DEBUG] No reply.text, using fallback');
        const intelligentResponse = provideIntelligentResponse(message);
        addMessage('assistant', intelligentResponse);
      }
      
      // If API suggests specific items, show them as cards
      if (Array.isArray(data.cards) && data.cards.length > 0) {
        console.log('[WIDGET DEBUG] Rendering cards:', data.cards.length);
        state.suggestions = data.cards;
        renderSuggestions();
        track('chat_reply', { cards: data.cards.length });
      }
    } catch (error) {
      console.error('[WIDGET DEBUG] Chat error:', error);
      
      // Better error UX based on response status
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        addMessage('assistant', "I'm having trouble connecting. Please check your internet and try again.");
      } else {
        // Fallback: provide intelligent responses
        const intelligentResponse = provideIntelligentResponse(message);
        addMessage('assistant', intelligentResponse);
      }
    } finally {
      state.isLoading = false;
      elements.chatSubmit.disabled = false;
    }
  }

  // Provide intelligent AI responses (concise version)
  function provideIntelligentResponse(message) {
    if (!state.menu) return "I'm sorry, I don't have access to the menu right now. Please try again later.";

    const q = message.toLowerCase();
    const allItems = state.menu.flatMap(s => s.items || []);
    const intent = detectIntent(q);
    state.lastIntent = intent;

    // Glossary ("what is tofu?", etc.)
    if (intent === "glossary") {
      const m = q.match(/\bwhat(?:'| i)?s\s+([a-z]+)/i);
      const term = m && m[1] ? m[1].toLowerCase() : "";
      const ans = GLOSSARY[term];
      if (ans) {
        state.suggestions = []; // no cards for glossary
        addAssistantReply({
          text: ans,
          chips: term === "tofu" ? ["See vegan swaps", "Show vegetarian"] : ["Show vegetarian"],
          context: "Simple definitions for common ingredients.",
          locale: "en",
        });
        return ans; // for the legacy path
      }
    }

    // Intent-specific suggestions
    const by = (pred) => pickCards(allItems.filter(pred), 3);

    if (intent === "pizza") {
      const cards = by(i => /pizza/i.test(i.name));
      if (cards.length) {
        state.suggestions = cards;
        renderSuggestions();
        return "Here are the pizzas we serve.";
      }
    }

    if (intent === "italian") {
      const cards = by(i =>
        /italian|pizza|pasta|risotto|bruschetta/i.test(i.description || "") ||
        /pizza|pasta|risotto|bruschetta/i.test(i.name)
      );
      if (cards.length) {
        state.suggestions = cards;
        renderSuggestions();
        return "Here are a few Italian picks. Prefer vegetarian or spicy?";
      }
    }

    if (intent === "indian" || intent === "mexican") {
      const map = {
        indian: /indian|curry|tikka|biryani|naan|dal|paneer/i,
        mexican: /mexican|taco|burrito|quesadilla|guacamole|salsa/i,
      };
      const cards = by(i => map[intent].test(i.name) || map[intent].test(i.description || ""));
      if (cards.length) {
        state.suggestions = cards;
        renderSuggestions();
        return `Here are a few ${intent} options. Want spicy or mild?`;
      }
    }

    if (intent === "vegan") {
      const cards = by(i =>
        /vegan/i.test(i.description || "") ||
        (Array.isArray(i.allergens) && i.allergens.some(a => /vegan/i.test(a)))
      );
      if (cards.length) {
        state.suggestions = cards;
        renderSuggestions();
        return `Found ${cards.length} vegan options. Want budget picks?`;
      }
      addAssistantReply({
        text: "I don't see items marked vegan, but several vegetarian dishes can be made vegan.",
        chips: ["Show vegetarian", "Suggest swaps"],
        context: "Typical swaps: tofu for paneer, olive oil for butter.",
        locale: "en",
      });
      return "I don't see items marked vegan…";
    }

    if (intent === "vegetarian") {
      const cards = by(i =>
        /vegetarian|paneer|dal|hummus|bruschetta/i.test(i.name) ||
        /vegetarian/i.test(i.description || "") ||
        ["Appetizers", "Desserts"].includes(i.category)
      );
      state.suggestions = cards;
      renderSuggestions();
      return `Here are vegetarian options. Many can be made vegan.`;
    }

    if (intent === "gluten") {
      const cards = by(i =>
        /gluten[- ]?free/i.test(i.description || "") ||
        (Array.isArray(i.allergens) && i.allergens.some(a => /gluten[- ]?free/i.test(a)))
      );
      if (cards.length) {
        state.suggestions = cards;
        renderSuggestions();
        return `Found ${cards.length} gluten-free options. Want more?`;
      }
      addAssistantReply({
        text: "No items are marked gluten-free, but some can be adapted.",
        chips: ["Show mains", "Show drinks"],
        context: "We can remove bread/pasta in some dishes if suitable.",
        locale: "en",
      });
      return "No gluten-free labels found.";
    }

    if (intent === "spicy") {
      const cards = by(i =>
        /spicy|chili|chilli|pepper/i.test(i.description || "") ||
        /spicy/i.test(i.name)
      );
      if (cards.length) {
        state.suggestions = cards;
        renderSuggestions();
        return `Found ${cards.length} spicy dishes. Want milder picks?`;
      }
    }

    if (intent === "budget") {
      const cards = by(i => {
        const c = i.price_cents ?? Math.round((i.price || 0) * 100);
        return c < 15000;
      });
      if (cards.length) {
        state.suggestions = cards;
        renderSuggestions();
        return `Budget-friendly picks under 150 SEK.`;
      }
    }

    // Popular / default
    if (intent === "popular") {
      const cards = by(i => ["Mains", "Appetizers"].includes(i.category));
      state.suggestions = cards;
      renderSuggestions();
      return "Here are our popular choices.";
    }

    // True fallback (only show once; otherwise we'll be chatty but not spammy)
    if (sameText(state._lastAssistantText, GENERIC_HELP)) {
      return "Tell me a cuisine (Italian, Indian), or say vegan/vegetarian/spicy/budget.";
    }
    return GENERIC_HELP;
  }

   

  // Add message to chat
  function addMessage(type, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `stjarna-message ${type}`;
    messageDiv.innerHTML = `<div class="stjarna-message-content">${escapeHtml(content)}</div>`;
    elements.chatMessages.appendChild(messageDiv);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
  }

  // Add assistant reply with chips and context
  function addAssistantReply(reply) {
    // De-dup identical consecutive assistant text
    if (sameText(reply.text, state._lastAssistantText)) {
      reply = { ...reply, chips: [] };
    }
    state._lastAssistantText = reply.text || "";

    // De-dup chip sets (don't show identical set back-to-back)
    let chips = Array.isArray(reply.chips) ? reply.chips : [];
    const chipsKey = chips.join("|").toLowerCase();
    if (chipsKey === state._lastChipsKey) chips = [];
    state._lastChipsKey = chipsKey;

    const wrap = document.createElement('div');
    wrap.className = 'stjarna-message assistant';
    const chipsHtml = chips.map(c => `<button class="stjarna-quick-btn">${escapeHtml(c)}</button>`).join('');
    wrap.innerHTML = `
      <div class="stjarna-message-content">
        <p>${escapeHtml(reply.text || '')}</p>
        ${reply.context ? `<p class="stjarna-context">${escapeHtml(reply.context)}</p>` : ''}
        ${chips.length ? `<div class="stjarna-quick-questions">${chipsHtml}</div>` : ''}
        <p class="stjarna-disclaimer">Ingredients from our menu; preparation may vary.</p>
      </div>
    `;
    elements.chatMessages.appendChild(wrap);
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;

    // chip interactions
    wrap.querySelectorAll('.stjarna-quick-btn').forEach(b => {
      b.addEventListener('click', () => {
        elements.chatInput.value = b.textContent;
        sendMessage();
      });
    });
  }

  

  // Render menu items in the grid
  function renderMenuItems() {
    if (!elements.menuGrid) return; // Guard against null element
    if (!state.menu || !Array.isArray(state.menu)) return; // Guard against invalid menu
    
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
          <button class="stjarna-add-btn" data-id="${escapeHtml(item.id)}" aria-label="Add ${escapeHtml(item.name)} to cart">
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
     if (!elements.chatMessages) return; // Guard against null element
     if (!state.menu || !Array.isArray(state.menu)) return; // Guard against invalid menu
     if (!state.suggestions || state.suggestions.length === 0) return; // <-- no random fallbacks
     const items = state.suggestions;

     // Add suggestions as chat message with cards
           const suggestionsHtml = items.map(item => `
        <div class="stjarna-chat-card" role="group" aria-labelledby="card-name-${escapeHtml(item.id)}">
          <div class="stjarna-chat-card-header">
            <h4 class="stjarna-chat-card-name" id="card-name-${escapeHtml(item.id)}">${escapeHtml(item.name)}</h4>
            <span class="stjarna-chat-card-price">${formatPrice(item)}</span>
          </div>
          ${item.description ? `<p class="stjarna-chat-card-desc">${escapeHtml(item.description)}</p>` : ''}
          ${item.allergens && item.allergens.length > 0 ? `
            <div class="stjarna-chat-card-tags">
              ${item.allergens.map(tag => `<span class="stjarna-chat-tag">${escapeHtml(tag)}</span>`).join('')}
            </div>
          ` : ''}
          <button class="stjarna-chat-add-btn" data-id="${escapeHtml(item.id)}" aria-label="Add ${escapeHtml(item.name)} to cart">
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
      if (!elements.menuGrid) return; // Guard against null element
      
      const menuItems = elements.menuGrid.querySelectorAll('.stjarna-menu-item');
      const suggestedIds = suggestedItems.map(item => item.id);
      
      menuItems.forEach(item => {
        const addBtn = item.querySelector('.stjarna-add-btn');
        if (!addBtn) return;
        
        const itemId = addBtn.dataset?.id;
        if (!itemId) return;
        
        if (suggestedIds.map(String).includes(String(itemId))) {
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
     if (state.isClosed) {
       addMessage('assistant', "We're currently closed—browse freely, but ordering resumes when we reopen.");
       return;
     }
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
    track('add_to_cart', { itemId });
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
      elements.cartTotal.textContent = formatPrice({ price_cents: total, currency: 'SEK' });
      elements.cartCount.textContent = String(
        state.cart.reduce((n, it) => n + it.quantity, 0)
      );
      
      // Render cart items
      elements.cartItems.innerHTML = state.cart.map(item => `
        <div class="stjarna-cart-item">
          <div class="stjarna-cart-item-info">
            <div class="stjarna-cart-item-name">${escapeHtml(item.name)}</div>
            <div class="stjarna-cart-item-quantity">Qty: ${item.quantity}</div>
          </div>
          <div class="stjarna-cart-item-price">${formatPrice(item)}</div>
        </div>
      `).join('');
      
      const hasItems = state.cart.length > 0;
      elements.dineInBtn.disabled = !hasItems || state.isClosed;
      elements.pickupBtn.disabled = !hasItems || state.isClosed;
      
      // Persist cart
      localStorage.setItem(CART_KEY(state.restaurantId), JSON.stringify(state.cart));
    }

  // Create order
  async function createOrder(type) {
    if (state.cart.length === 0) return;

    // Fire telemetry
    track('checkout_start', { type });

    try {
      const response = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Widget-Version': WIDGET_VERSION },
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

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      
      if (type === 'dine_in' && data.orderCode) {
        alert(`Your order code is: ${data.orderCode}`);
        state.cart = [];
        updateCart();
             } else if (type === 'pickup' && data.checkoutUrl) {
         const w = window.open(data.checkoutUrl, '_blank', 'noopener');
         if (w) w.opener = null;
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
     if (text == null) return '';
     const div = document.createElement('div');
     div.textContent = String(text);
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
})();
