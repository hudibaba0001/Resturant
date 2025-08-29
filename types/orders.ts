export type OrderItemDTO = {
  id: string;
  qty: number;
  price_cents: number;
  notes: string | null;
  menu_item: { id: string; name: string; currency: string } | null;
};

export type OrderDTO = {
  id: string;
  order_code: string;      // <- canonical
  status: string;
  total_cents: number;
  currency: string;
  created_at: string;
  items: OrderItemDTO[];
};
