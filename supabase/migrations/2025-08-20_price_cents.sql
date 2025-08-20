-- Add price_cents and currency columns to menu_items
-- This migration provides backward compatibility with existing price DECIMAL field

-- Add new columns
ALTER TABLE public.menu_items 
ADD COLUMN IF NOT EXISTS price_cents INTEGER,
ADD COLUMN IF NOT EXISTS currency CHAR(3) DEFAULT 'SEK';

-- Backfill price_cents from existing price DECIMAL (if it exists)
UPDATE public.menu_items 
SET price_cents = ROUND(price * 100)
WHERE price_cents IS NULL AND price IS NOT NULL;

-- Add constraint to ensure price_cents is positive
ALTER TABLE public.menu_items 
ADD CONSTRAINT menu_items_price_cents_positive 
CHECK (price_cents IS NULL OR price_cents >= 0);

-- Add index for price_cents queries
CREATE INDEX IF NOT EXISTS idx_menu_items_price_cents 
ON public.menu_items(price_cents) 
WHERE price_cents IS NOT NULL;

-- Update the orders table to ensure currency exists
ALTER TABLE public.orders 
ALTER COLUMN currency SET DEFAULT 'SEK';

-- Add constraint to ensure orders currency is valid
ALTER TABLE public.orders 
ADD CONSTRAINT orders_currency_valid 
CHECK (currency IN ('SEK', 'USD', 'EUR', 'GBP'));

-- Create a function to get menu item price in cents (with fallback)
CREATE OR REPLACE FUNCTION get_menu_item_price_cents(item_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
    price_cents_val INTEGER;
    price_val DECIMAL;
BEGIN
    -- Try to get price_cents first
    SELECT price_cents INTO price_cents_val
    FROM public.menu_items 
    WHERE id = item_uuid;
    
    -- If price_cents exists, return it
    IF price_cents_val IS NOT NULL THEN
        RETURN price_cents_val;
    END IF;
    
    -- Fallback to price * 100
    SELECT price INTO price_val
    FROM public.menu_items 
    WHERE id = item_uuid;
    
    IF price_val IS NOT NULL THEN
        RETURN ROUND(price_val * 100);
    END IF;
    
    -- No price found
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
