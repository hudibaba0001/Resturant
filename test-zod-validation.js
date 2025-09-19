// Test Zod validation to see if section_id is being processed correctly
const { z } = require('zod');

const ItemCreateSchema = z.object({
  restaurant_id: z.string().uuid(),
  category: z.string().min(1),
  section_path: z.array(z.string()).min(1),
  section_id: z.string().uuid().optional(),
  name: z.string().min(1),
  description: z.string().trim().nullable().optional(),
  price_cents: z.number().int().nonnegative(),
  price: z.number().nonnegative(),
  currency: z.string().min(1).transform(v => v.toUpperCase().slice(0, 3)),
  image_url: z.string().url().nullable().optional(),
  is_available: z.boolean().default(true),
});

const testPayload = {
  restaurant_id: "64806e5b-714f-4388-a092-29feff9b64c0",
  category: "main",
  section_path: ["Test Drinks"],
  section_id: "fb32d946-a551-4754-8fed-f59767357d68",
  name: "Test Item",
  description: "Test description",
  price_cents: 2000,
  price: 20,
  currency: "SEK",
  image_url: null,
  is_available: true,
};

console.log("Testing Zod validation...");
console.log("Input payload:", JSON.stringify(testPayload, null, 2));

const result = ItemCreateSchema.safeParse(testPayload);

if (result.success) {
  console.log("✅ Zod validation passed");
  console.log("Parsed data:", JSON.stringify(result.data, null, 2));
  console.log("section_id in parsed data:", result.data.section_id);
} else {
  console.log("❌ Zod validation failed");
  console.log("Errors:", result.error.issues);
}
