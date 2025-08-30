export type VariantSelection = {
  groupId: string;
  optionId: string;
  name: string;
  plus_cents: number;
};

export type ModifierSelection = {
  optionId: string;
  name: string;
  plus_cents: number;
};

export type CartLine = {
  tempId: string;
  itemId: string;
  name: string;
  qty: number;
  unit_cents: number;
  currency: string;
  variant?: VariantSelection;        // optional!
  modifiers?: ModifierSelection[];   // optional! default []
};

// Store shape
export type WidgetState = {
  restaurantId: string;
  sessionId: string;
  sessionToken: string;
  cart: CartLine[];
  ui: 'menu' | 'item' | 'cart' | 'checkout' | null;
  selectedItem: any | null;
  setContext: (restaurantId: string, sessionId: string, sessionToken: string) => void;
  bootstrapSession: (restaurantId: string) => Promise<boolean>;
  openItem: (item: any) => void;
  closeModal: () => void;
  addToCart: (input: Omit<CartLine, 'tempId'>) => void;
  updateCartLine: (tempId: string, patch: Partial<CartLine>) => void;
  removeCartLine: (tempId: string) => void;
  clearCart: () => void;
  go: (ui: 'menu' | 'item' | 'cart' | 'checkout' | null) => void;
};
