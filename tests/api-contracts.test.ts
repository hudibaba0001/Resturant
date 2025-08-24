import { describe, it, expect } from 'vitest';
import { MenuResponse, ChatReply, MenuItem } from '../lib/schemas';

describe('API Contracts with Zod', () => {
  it('menu response validates with correct shape', () => {
    const mockMenu = {
      sections: [
        {
          id: '1',
          name: 'Starters',
          items: [
            {
              id: '1',
              name: 'Bruschetta',
              price_cents: 1200,
              description: 'Fresh tomato and basil',
              is_available: true,
            },
          ],
        },
      ],
      restaurant: {
        id: 'rest-1',
        name: 'Test Restaurant',
        is_open: true,
      },
    };

    expect(() => MenuResponse.parse(mockMenu)).not.toThrow();
    expect(mockMenu.sections[0].items[0].price_cents).toBe(1200);
  });

  it('chat response validates with correct shape and limits', () => {
    const mockChat = {
      reply: {
        text: 'Here are some great options for you!',
        context: 'user asked for italian',
        chips: ['pizza', 'pasta'],
        locale: 'en',
      },
      cards: [
        {
          id: '1',
          name: 'Margherita Pizza',
          price_cents: 1800,
          is_available: true,
        },
        {
          id: '2',
          name: 'Caesar Salad',
          price_cents: 1400,
          is_available: true,
        },
      ],
    };

    expect(() => ChatReply.parse(mockChat)).not.toThrow();
    expect(mockChat.cards.length).toBeLessThanOrEqual(3);
    expect(mockChat.reply.text.length).toBeGreaterThan(0);
    expect(mockChat.reply.text.length).toBeLessThanOrEqual(450);
  });

  it('rejects invalid menu response', () => {
    const invalidMenu = {
      sections: 'not an array',
    };

    expect(() => MenuResponse.parse(invalidMenu)).toThrow();
  });

  it('rejects chat response with too many cards', () => {
    const invalidChat = {
      reply: { text: 'Hello' },
      cards: Array(5).fill({
        id: '1',
        name: 'Item',
        price_cents: 1000,
        is_available: true,
      }),
    };

    expect(() => ChatReply.parse(invalidChat)).toThrow();
  });

  it('rejects chat response with text too long', () => {
    const invalidChat = {
      reply: { text: 'x'.repeat(500) }, // Over 450 char limit
      cards: [],
    };

    expect(() => ChatReply.parse(invalidChat)).toThrow();
  });

  it('validates menu item with optional fields', () => {
    const minimalItem = {
      id: '1',
      name: 'Simple Item',
      price_cents: 1000,
    };

    const fullItem = {
      id: '2',
      name: 'Complex Item',
      price_cents: 2000,
      description: 'A detailed description',
      allergens: ['nuts', 'dairy'],
      tags: ['vegan', 'gluten-free'],
      is_available: true,
    };

    expect(() => MenuItem.parse(minimalItem)).not.toThrow();
    expect(() => MenuItem.parse(fullItem)).not.toThrow();
  });
});
