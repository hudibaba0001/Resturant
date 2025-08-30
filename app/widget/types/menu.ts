export type VariantOption = { id: string; name: string; plus_cents: number };
export type VariantGroup = { id: string; name: string; required: boolean; options: VariantOption[] };

export type ModifierOption = { id: string; name: string; plus_cents: number; is_available: boolean };
export type ModifierGroup = { id: string; name: string; min: number; max: number; options: ModifierOption[] };

export interface MenuItemDTO {
  id: string;
  name: string;
  thumb: string | null;
  desc: string | null;
  price_cents: number;
  currency: string;
  dietary: string[];
  variantGroups?: VariantGroup[];
  modifierGroups?: ModifierGroup[];
}
