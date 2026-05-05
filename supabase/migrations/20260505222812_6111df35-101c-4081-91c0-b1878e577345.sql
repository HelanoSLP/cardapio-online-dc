ALTER TABLE public.extra_ingredients ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'snack';
-- category values: 'pizza' or 'snack' (lanches)
UPDATE public.extra_ingredients SET category = 'snack' WHERE category IS NULL;