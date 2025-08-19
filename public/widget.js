(function() {
  'use strict';

  // Widget configuration
  const config = {
    apiBase: window.location.origin,
    sessionToken: 'widget-' + Math.random().toString(36).substr(2, 9),
  };

  // Get restaurant ID from script tag
  const script = document.currentScript || document.querySelector('script[data-restaurant]');
  const restaurantId = script?.getAttribute('data-restaurant');

  if (!restaurantId) {
    console.error('Restaurant ID not found in widget script tag');
    return;
  }

  // Create widget container
  const widgetContainer = document.createElement('div');
  widgetContainer.id = 'restaurant-widget';
  widgetContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 350px;
    height: 500px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    display: none;
    flex-direction: column;
    overflow: hidden;
  `;

  // Create header
  const header = document.createElement('div');
  header.style.cssText = `
    background: #1f2937;
    color: white;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  `;
  header.innerHTML = `
    <h3 style="margin: 0; font-size: 16px;">Restaurant Assistant</h3>
    <button id="widget-close" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px;">×</button>
  `;

  // Create chat container
  const chatContainer = document.createElement('div');
  chatContainer.id = 'chat-container';
  chatContainer.style.cssText = `
    flex: 1;
    padding: 16px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 12px;
  `;

  // Create input area
  const inputArea = document.createElement('div');
  inputArea.style.cssText = `
    padding: 16px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    gap: 8px;
  `;

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Ask about our menu...';
  input.style.cssText = `
    flex: 1;
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
  `;

  const sendButton = document.createElement('button');
  sendButton.textContent = 'Send';
  sendButton.style.cssText = `
    padding: 8px 16px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
  `;

  // Create toggle button
  const toggleButton = document.createElement('button');
  toggleButton.innerHTML = '🍽️';
  toggleButton.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 60px;
    height: 60px;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 50%;
    cursor: pointer;
    font-size: 24px;
    z-index: 10001;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  `;

  // Assemble widget
  inputArea.appendChild(input);
  inputArea.appendChild(sendButton);
  widgetContainer.appendChild(header);
  widgetContainer.appendChild(chatContainer);
  widgetContainer.appendChild(inputArea);

  // Add to page
  document.body.appendChild(widgetContainer);
  document.body.appendChild(toggleButton);

  // Event handlers
  let isOpen = false;

  toggleButton.addEventListener('click', () => {
    isOpen = !isOpen;
    widgetContainer.style.display = isOpen ? 'flex' : 'none';
    toggleButton.style.display = isOpen ? 'none' : 'block';
    if (isOpen) {
      input.focus();
    }
  });

  document.getElementById('widget-close').addEventListener('click', () => {
    isOpen = false;
    widgetContainer.style.display = 'none';
    toggleButton.style.display = 'block';
  });

  // Add message to chat
  function addMessage(content, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
      padding: 8px 12px;
      border-radius: 8px;
      max-width: 80%;
      word-wrap: break-word;
      ${isUser ? 
        'background: #3b82f6; color: white; align-self: flex-end;' : 
        'background: #f3f4f6; color: #374151; align-self: flex-start;'
      }
    `;
    messageDiv.textContent = content;
    chatContainer.appendChild(messageDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  // Send message
  async function sendMessage() {
    const message = input.value.trim();
    if (!message) return;

    // Add user message
    addMessage(message, true);
    input.value = '';

    // Show loading
    const loadingDiv = document.createElement('div');
    loadingDiv.textContent = '...';
    loadingDiv.style.cssText = `
      padding: 8px 12px;
      background: #f3f4f6;
      border-radius: 8px;
      align-self: flex-start;
      color: #6b7280;
    `;
    chatContainer.appendChild(loadingDiv);

    try {
      const response = await fetch(`${config.apiBase}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantId,
          sessionToken: config.sessionToken,
          message,
        }),
      });

      const data = await response.json();
      
      // Remove loading
      chatContainer.removeChild(loadingDiv);

      if (data.error) {
        addMessage('Sorry, I encountered an error. Please try again.');
      } else {
        addMessage(data.response);
      }
    } catch (error) {
      console.error('Chat error:', error);
      chatContainer.removeChild(loadingDiv);
      addMessage('Sorry, I\'m having trouble connecting. Please try again.');
    }
  }

  // Send message on button click or Enter key
  sendButton.addEventListener('click', sendMessage);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  });

  // Add welcome message
  addMessage('Hi! I\'m here to help you with any questions about our restaurant and menu. What would you like to know?');

})();
