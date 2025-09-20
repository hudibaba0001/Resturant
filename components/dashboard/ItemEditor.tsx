'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { nanoid } from 'nanoid';

type VariantChoice = {
  name: string;
  price_delta_cents?: number;
  sku?: string;
  is_default?: boolean;
};

type ModifierChoice = {
  name: string;
  price_cents?: number;
};

type ModifierGroup = {
  group: string;
  min?: number;
  max?: number;
  required?: boolean;
  choices: ModifierChoice[];
};

type Item = {
  id?: string;
  restaurantId: string;
  menu: string;
  name: string;
  price_cents: number;
  currency: string;
  section_path: string[];
  section_id?: string;
  description?: string;
  image_url?: string;
  is_available?: boolean;
  variant_groups?: VariantChoice[];
  modifier_groups?: ModifierGroup[];
  tags?: string[];
  details?: Record<string, any>;
};

type ItemEditorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  menu: string;
  sectionPath: string[];
  sectionId?: string | undefined;
  initialItem?: Item;
  onSaved?: (id: string) => void;
};

export function ItemEditor({
  open,
  onOpenChange,
  restaurantId,
  menu,
  sectionPath,
  sectionId,
  initialItem,
  onSaved,
}: ItemEditorProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [topError, setTopError] = useState<string>('');

  // Form state
  const [formData, setFormData] = useState<Item>({
    id: initialItem?.id || crypto.randomUUID(),
    restaurantId,
    menu,
    name: initialItem?.name || '',
    price_cents: initialItem?.price_cents || 0,
    currency: initialItem?.currency || 'SEK',
    section_path: sectionPath, // Always use the passed sectionPath
    ...(sectionId && { section_id: sectionId }),
    description: initialItem?.description || '',
    image_url: initialItem?.image_url || '',
    is_available: initialItem?.is_available ?? true,
    variant_groups: initialItem?.variant_groups || [],
    modifier_groups: initialItem?.modifier_groups || [],
    tags: initialItem?.tags || [],
    details: initialItem?.details || {},
  });

  const [variants, setVariants] = useState<VariantChoice[]>(formData.variant_groups || []);
  const [modifiers, setModifiers] = useState<ModifierGroup[]>(formData.modifier_groups || []);
  const [tags, setTags] = useState<string[]>(formData.tags || []);
  const [detailsJson, setDetailsJson] = useState<string>(JSON.stringify(formData.details || {}, null, 2));

  const updateFormData = (updates: Partial<Item>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const parsePrice = (input: string): number => {
    const cleaned = input.replace(',', '.').trim();
    if (!cleaned) return 0;
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : Math.round(num * 100); // Convert to cents
  };

  const formatPrice = (cents: number): string => {
    return (cents / 100).toFixed(2).replace('.', ',');
  };

  const handleSave = async () => {
    setIsSubmitting(true);
    setErrors({});
    setTopError('');

    try {
      // Build final payload
      const payload: Item = {
        ...formData,
        variant_groups: variants,
        modifier_groups: modifiers,
        tags: tags,
        details: (() => {
          try {
            return JSON.parse(detailsJson);
          } catch {
            return {};
          }
        })(),
      };

      // For CREATE, remove the id from payload (only use in URL for PATCH)
      const creating = !initialItem?.id;
      if (creating) {
        delete (payload as any).id;
      }

      console.log('🚀 Saving item with payload:', payload);

      const url = creating 
        ? '/dashboard/proxy/items'
        : `/dashboard/proxy/items/${initialItem!.id}`;
      
      const method = creating ? 'POST' : 'PATCH';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        console.group('❌ Create/Update item failed');
        console.log('Status:', response.status);
        console.log('Payload sent:', payload);
        console.log('Response body:', result);
        console.groupEnd();

        if (result.issues) {
          // Zod validation errors
          const fieldErrors: Record<string, string> = {};
          result.issues.forEach((issue: any) => {
            const field = issue.path?.join('.') || 'unknown';
            fieldErrors[field] = issue.message;
          });
          setErrors(fieldErrors);
          setTopError(`Validation errors: ${result.issues.map((i: any) => `${i.path?.join('.')}: ${i.message}`).join(', ')}`);
        } else {
          setTopError(result.message || `Save failed: ${response.status}`);
        }
        return;
      }

      console.log('✅ Item saved successfully:', result);
      
      // Success
      onOpenChange(false);
      if (onSaved) {
        onSaved(result.data?.id || result.id || payload.id!);
      }
      router.refresh();

    } catch (error) {
      console.error('❌ Save error:', error);
      setTopError(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialItem?.id ? 'Edit Item' : 'Add Item'}
          </DialogTitle>
        </DialogHeader>

        {topError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {topError}
          </div>
        )}

        <Tabs defaultValue="basic" className="w-full">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="basic">Basic Info</TabsTrigger>
            <TabsTrigger value="variants">Variants</TabsTrigger>
            <TabsTrigger value="modifiers">Modifiers</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => updateFormData({ name: e.target.value })}
                  placeholder="Item name"
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label>Price (SEK) *</Label>
                <Input
                  type="text"
                  value={formatPrice(formData.price_cents)}
                  onChange={(e) => updateFormData({ price_cents: parsePrice(e.target.value) })}
                  placeholder="49,00"
                />
                {errors.price_cents && <p className="text-sm text-red-500">{errors.price_cents}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description || ''}
                onChange={(e) => updateFormData({ description: e.target.value })}
                placeholder="Item description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Image URL</Label>
              <Input
                value={formData.image_url || ''}
                onChange={(e) => updateFormData({ image_url: e.target.value })}
                placeholder="https://example.com/image.jpg"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="available"
                checked={formData.is_available ?? true}
                onCheckedChange={(checked) => updateFormData({ is_available: !!checked })}
              />
              <Label htmlFor="available">Available for ordering</Label>
            </div>
          </TabsContent>

          <TabsContent value="variants" className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Variant Groups</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVariants([...variants, { name: '' }])}
                >
                  Add Variant Group
                </Button>
              </div>

              {variants.map((variant, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Group name (e.g., Size)"
                      value={variant.name}
                      onChange={(e) => {
                        const newVariants = [...variants];
                        newVariants[index] = { ...variant, name: e.target.value };
                        setVariants(newVariants);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setVariants(variants.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="modifiers" className="space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Modifier Groups</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModifiers([...modifiers, { group: '', choices: [] }])}
                >
                  Add Modifier Group
                </Button>
              </div>

              {modifiers.map((modifier, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-3">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Group name (e.g., Milk)"
                      value={modifier.group}
                      onChange={(e) => {
                        const newModifiers = [...modifiers];
                        newModifiers[index] = { ...modifier, group: e.target.value };
                        setModifiers(newModifiers);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setModifiers(modifiers.filter((_, i) => i !== index))}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Tags (comma-separated)</Label>
                <Input
                  value={tags.join(', ')}
                  onChange={(e) => setTags(e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                  placeholder="vegan, gluten_free, spicy"
                />
              </div>

              <div className="space-y-2">
                <Label>Details (JSON)</Label>
                <Textarea
                  value={detailsJson}
                  onChange={(e) => setDetailsJson(e.target.value)}
                  placeholder='{"allergens": ["nuts"], "calories_kcal": 120}'
                  rows={6}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : (initialItem?.id ? 'Update Item' : 'Save Item')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
