// Client payload types for Items API (proxy routes)
// These mirror the server's accepted shapes.

export type VariantChoice = {
  name: string;
  price_delta_cents?: number;
  sku?: string;
  is_default?: boolean;
};

export type VariantGroup = {
  name: string;
  choices: VariantChoice[];
};

export type ModifierChoice = {
  name: string;
  price_cents?: number;
};

export type ModifierGroup = {
  group: string;
  min?: number;
  max?: number;
  required?: boolean;
  choices: ModifierChoice[];
};

export type ItemClient = {
  restaurantId: string;
  menu: string; // menu slug, maps to DB category
  name: string;
  price_cents: number;
  currency: string; // e.g., "SEK"
  section_path: string[]; // ["Drinks"]
  description?: string | null;
  image_url?: string | null;
  is_available?: boolean;
  variant_groups?: VariantGroup[];
  modifier_groups?: ModifierGroup[];
  tags?: string[];
  details?: Record<string, unknown>;
};


