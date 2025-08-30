export type UUID = string;

export type Menu = {
  id: string;       // slug
  name: string;     // display name
};

export type Section = {
  id: string;               // path joined by ":" (stable id in simple mode)
  menuId: string;           // menu slug
  name: string;
  parentId?: string | null; // parent section id
  path: string[];           // ["Starters"], ["Pizza","Classics"], etc.
  sort?: number;            // order at its level
};

export type Option = {
  id: string;     // stable id (nanoid)
  name: string;
  plus_cents?: number; // for OptionGroups we keep price delta at matrix level; plus_cents optional
};

export type OptionGroup = {
  id: string;      // stable id (nanoid)
  name: string;    // e.g., Size
  options: Option[];
};

export type ModifierOption = {
  id: string;      // stable id (nanoid)
  name: string;
  price_delta_cents?: number; // can be negative
};

export type ModifierGroup = {
  id: string;       // stable id
  name: string;     // e.g., Add-ons
  min?: number;     // default 0
  max?: number;     // default unlimited
  required?: boolean;
  options: ModifierOption[];
};

export type PriceMatrix = Record<string, number>; // key signature of selected options -> price_cents

export type Item = {
  id: UUID;
  restaurant_id: UUID;
  name: string;
  description?: string | null;
  image_url?: string | null;
  price_cents?: number | null; // base price for simple items
  currency?: string | null;    // defaults to SEK in DB
  allergens?: string[] | null;
  is_available: boolean;

  // Extended (in nutritional_info JSONB)
  menu: string;                  // menu slug e.g., "lunch"
  section_path: string[];        // ["Burgers"] or ["Pizza","Classics"]
  dietary?: string[];            // Vegan, Vegetarian, etc.
  item_number?: string | null;
  variant_groups?: OptionGroup[];
  modifier_groups?: ModifierGroup[];
  price_matrix?: PriceMatrix;    // per-variant price override
  sort?: number;                 // item order within section
  section_sort?: number;         // cached order for section level
};
