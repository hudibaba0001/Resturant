'use client';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { nanoid } from 'nanoid';
import type { Item, OptionGroup, ModifierGroup, PriceMatrix } from '@/lib/types/menu';
import { ImageUpload } from './image-upload';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const Allergens = ['Gluten','Nuts','Milk','Eggs','Soy','Fish','Shellfish'];
const Dietary = ['Vegan','Vegetarian','Halal','Kosher','Gluten-free'];

const ItemSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  image_url: z.string().optional(),
  price_cents: z.number().int().nonnegative().optional(),
  currency: z.string().optional(),
  allergens: z.array(z.string()).optional(),
  dietary: z.array(z.string()).optional(),
  item_number: z.string().optional(),
});

export function EditItemDialog({
  open,
  onOpenChange,
  initial,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: Item;
  onSave: (i: Item) => Promise<void> | void;
}) {
  const [variantGroups, setVariantGroups] = useState<OptionGroup[]>(initial.variant_groups || []);
  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>(initial.modifier_groups || []);
  const [priceMatrix, setPriceMatrix] = useState<PriceMatrix>(initial.price_matrix || {});

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<z.infer<typeof ItemSchema>>({
    resolver: zodResolver(ItemSchema),
    defaultValues: {
      name: initial.name || '',
      description: initial.description || '',
      image_url: initial.image_url || '',
      price_cents: initial.price_cents || undefined,
      currency: initial.currency || 'SEK',
      allergens: initial.allergens || [],
      dietary: initial.dietary || [],
      item_number: initial.item_number || '',
    },
  });

  // Compute variant combinations for the matrix
  const combinations = useMemo(() => {
    if (!variantGroups.length) return [] as { key: string; label: string }[];
    const lists = variantGroups.map(g => g.options.map(o => ({ group: g, option: o })));
    // Cartesian product
    const prod = (a: any[][], b: any[]) => a.flatMap(x => b.map(y => [...x, y]));
    const cart = lists.reduce((acc, list) => (acc.length ? prod(acc as any, list) : list.map(l => [l])), [] as any);
    return (cart as any[]).map((combo) => {
      const key = combo.map((c: any) => `${c.group.id}:${c.option.id}`).join('|');
      const label = combo.map((c: any) => `${c.group.name}: ${c.option.name}`).join(' • ');
      return { key, label };
    });
  }, [variantGroups]);

  const onSubmit = async (v: z.infer<typeof ItemSchema>) => {
    console.log("🔍 onSubmit called with:", v);
    console.log("🔍 Form errors:", errors);
    
    const next: Item = {
      ...initial,
      name: v.name,
      description: v.description || null,
      image_url: v.image_url || null,
      price_cents: v.price_cents ?? null,
      currency: v.currency || null,
      allergens: v.allergens || [],
      dietary: v.dietary || [],
      item_number: v.item_number || null,
      variant_groups: variantGroups,
      modifier_groups: modifierGroups,
      price_matrix: priceMatrix,
    };
    
    console.log("🔍 Calling onSave with:", next);
    await onSave(next);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{initial.id ? 'Edit Item' : 'Create Item'}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="basic">
          <TabsList className="grid grid-cols-4 mb-4">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="variants">Variants & Pricing</TabsTrigger>
            <TabsTrigger value="modifiers">Modifiers & Choices</TabsTrigger>
            <TabsTrigger value="details">Details & Tags</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input {...register('name')} />
              </div>
              <div className="space-y-2">
                <Label>Price (öre)</Label>
                <Input type="number" inputMode="numeric" {...register('price_cents', { valueAsNumber: true })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={4} {...register('description')} />
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              <ImageUpload value={watch('image_url') || ''} onChange={(u) => setValue('image_url', u)} />
            </div>
          </TabsContent>

          <TabsContent value="variants" className="space-y-4">
            <VariantGroupsEditor value={variantGroups} onChange={(v) => setVariantGroups([...v])} />
            {variantGroups.length > 0 && (
              <div className="space-y-2">
                <Label>Price Matrix</Label>
                <div className="space-y-2">
                  {combinations.map((c) => (
                    <div key={c.key} className="flex items-center gap-2">
                      <div className="flex-1 text-sm">{c.label}</div>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={priceMatrix[c.key] ?? ''}
                        onChange={(e) => setPriceMatrix({ ...priceMatrix, [c.key]: e.target.value ? parseInt(e.target.value) : undefined as any })}
                        placeholder="price in öre"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="modifiers" className="space-y-4">
            <ModifierGroupsEditor value={modifierGroups} onChange={(v) => setModifierGroups([...v])} />
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div>
              <Label>Allergens</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {Allergens.map(a => (
                  <label key={a} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={watch('allergens')?.includes(a) || false} onCheckedChange={(ck) => {
                      const cur = new Set(watch('allergens') || []);
                      ck ? cur.add(a) : cur.delete(a);
                      setValue('allergens', Array.from(cur));
                    }} /> {a}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <Label>Dietary Tags</Label>
              <div className="flex flex-wrap gap-3 mt-2">
                {Dietary.map(d => (
                  <label key={d} className="flex items-center gap-2 text-sm">
                    <Checkbox checked={watch('dietary')?.includes(d) || false} onCheckedChange={(ck) => {
                      const cur = new Set(watch('dietary') || []);
                      ck ? cur.add(d) : cur.delete(d);
                      setValue('dietary', Array.from(cur));
                    }} /> {d}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Item Number (optional)</Label>
              <Input {...register('item_number')} placeholder="e.g., 12B" />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSubmit(onSubmit)}>Save Item</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VariantGroupsEditor({ value, onChange }: { value: OptionGroup[]; onChange: (v: OptionGroup[]) => void }) {
  const addGroup = () => onChange([...value, { id: nanoid(), name: 'New Group', options: [] }]);
  const addOption = (gi: number) => {
    const next = [...value];
    if (next[gi]) {
      next[gi].options.push({ id: nanoid(), name: 'Option' });
      onChange(next);
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Option Groups</Label>
        <Button variant="secondary" onClick={addGroup}>+ Add Group</Button>
      </div>
      {value.map((g, gi) => (
        <div key={g.id} className="rounded-xl border p-3 space-y-2">
          <div className="flex items-center gap-2">
            <Input value={g.name} onChange={(e) => { const next = [...value]; if (next[gi]) next[gi].name = e.target.value; onChange(next); }} />
            <Button size="icon" variant="ghost" onClick={() => { const next = value.filter((_, i) => i !== gi); onChange(next); }}>✕</Button>
          </div>
          <div className="space-y-2">
            {g.options.map((o, oi) => (
              <div key={o.id} className="flex items-center gap-2">
                <Input value={o.name} onChange={(e) => { const next = [...value]; if (next[gi] && next[gi].options[oi]) next[gi].options[oi].name = e.target.value; onChange(next); }} />
                <Button size="icon" variant="ghost" onClick={() => { const next = [...value]; if (next[gi]) next[gi].options.splice(oi,1); onChange(next); }}>✕</Button>
              </div>
            ))}
            <Button variant="outline" onClick={() => addOption(gi)}>+ Add Option</Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function ModifierGroupsEditor({ value, onChange }: { value: ModifierGroup[]; onChange: (v: ModifierGroup[]) => void }) {
  const addGroup = () => onChange([...value, { id: nanoid(), name: 'New Group', min: 0, required: false, options: [] }]);
  const addOption = (gi: number) => {
    const next = [...value];
    if (next[gi]) {
      next[gi].options.push({ id: nanoid(), name: 'Option', price_delta_cents: 0 });
      onChange(next);
    }
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>Modifier Groups</Label>
        <Button variant="secondary" onClick={addGroup}>+ Add Group</Button>
      </div>
      {value.map((g, gi) => (
        <div key={g.id} className="rounded-xl border p-3 space-y-2">
          <div className="grid grid-cols-4 gap-2">
            <Input value={g.name} onChange={(e) => { const next = [...value]; if (next[gi]) next[gi].name = e.target.value; onChange(next); }} />
            <Input type="number" placeholder="min" value={g.min ?? ''} onChange={(e) => { const next = [...value]; if (next[gi]) next[gi].min = e.target.value ? parseInt(e.target.value) : undefined; onChange(next); }} />
            <Input type="number" placeholder="max" value={g.max ?? ''} onChange={(e) => { const next = [...value]; if (next[gi]) next[gi].max = e.target.value ? parseInt(e.target.value) : undefined; onChange(next); }} />
            <label className="flex items-center gap-2"><input type="checkbox" checked={!!g.required} onChange={(e) => { const next = [...value]; if (next[gi]) next[gi].required = e.target.checked; onChange(next); }} /> Required</label>
          </div>
          <div className="space-y-2">
            {g.options.map((o, oi) => (
              <div key={o.id} className="grid grid-cols-6 gap-2 items-center">
                <Input className="col-span-4" value={o.name} onChange={(e) => { const next = [...value]; if (next[gi] && next[gi].options[oi]) next[gi].options[oi].name = e.target.value; onChange(next); }} />
                <Input className="col-span-1" type="number" value={o.price_delta_cents ?? 0} onChange={(e) => { const next = [...value]; if (next[gi] && next[gi].options[oi]) next[gi].options[oi].price_delta_cents = parseInt(e.target.value || '0'); onChange(next); }} />
                <Button size="icon" variant="ghost" onClick={() => { const next = [...value]; if (next[gi]) next[gi].options.splice(oi,1); onChange(next); }}>✕</Button>
              </div>
            ))}
            <Button variant="outline" onClick={() => addOption(gi)}>+ Add Modifier</Button>
          </div>
        </div>
      ))}
    </div>
  );
}
