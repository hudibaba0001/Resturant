import { itemClientSchema } from "@/lib/validators/itemClient";
import type { ItemClient } from "@/lib/types/menuItem";

async function asJson(res: Response) {
  const txt = await res.text();
  try { return JSON.parse(txt); } catch { return { raw: txt }; }
}

export async function createItem(payload: ItemClient) {
  const data = itemClientSchema.parse(payload);
  const res = await fetch("/dashboard/proxy/items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const j = await asJson(res);
    throw { status: res.status, ...j } as any;
  }
  return asJson(res);
}

export async function updateItem(id: string, payload: Partial<ItemClient>) {
  const partial = itemClientSchema.partial().parse(payload as any);
  const res = await fetch(`/dashboard/proxy/items/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(partial),
  });
  if (!res.ok) {
    const j = await asJson(res);
    throw { status: res.status, ...j } as any;
  }
  return asJson(res);
}


