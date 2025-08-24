import { describe, it, expect } from 'vitest';

// Mock API response shapes (contracts)
interface MenuResponse {
  sections: Array<{
    id: string;
    name: string;
    items: Array<{
      id: string;
      name: string;
      price_cents: number;
      description?: string;
    }>;
  }>;
}

interface ChatResponse {
  reply: {
    text: string;
  };
  cards: Array<{
    id: string;
    name: string;
    price_cents: number;
  }>;
}

// Contract validation functions
function validateMenuResponse(data: any): data is MenuResponse {
  return (
    Array.isArray(data.sections) &&
    data.sections.every(
      (section: any) =>
        section.id && section.name && Array.isArray(section.items),
    )
  );
}

function validateChatResponse(data: any): data is ChatResponse {
  return (
    data.reply?.text && Array.isArray(data.cards) && data.cards.length <= 3 // Max 3 cards as per requirements
  );
}

describe('API Contracts', () => {
  it('menu response has correct shape', () => {
    const mockMenu: MenuResponse = {
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
            },
          ],
        },
      ],
    };

    expect(validateMenuResponse(mockMenu)).toBe(true);
    expect(mockMenu.sections[0].items[0].price_cents).toBe(1200);
  });

  it('chat response has correct shape and limits', () => {
    const mockChat: ChatResponse = {
      reply: {
        text: 'Here are some great options for you!',
      },
      cards: [
        {
          id: '1',
          name: 'Margherita Pizza',
          price_cents: 1800,
        },
        {
          id: '2',
          name: 'Caesar Salad',
          price_cents: 1400,
        },
      ],
    };

    expect(validateChatResponse(mockChat)).toBe(true);
    expect(mockChat.cards.length).toBeLessThanOrEqual(3);
    expect(mockChat.reply.text.length).toBeGreaterThan(0);
  });

  it('rejects invalid menu response', () => {
    const invalidMenu = {
      sections: 'not an array',
    };

    expect(validateMenuResponse(invalidMenu)).toBe(false);
  });

  it('rejects chat response with too many cards', () => {
    const invalidChat = {
      reply: { text: 'Hello' },
      cards: Array(5).fill({ id: '1', name: 'Item', price_cents: 1000 }),
    };

    expect(validateChatResponse(invalidChat)).toBe(false);
  });
});
