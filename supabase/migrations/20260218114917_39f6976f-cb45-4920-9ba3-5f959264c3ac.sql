
-- Add parent_id to categories for subcategory support
ALTER TABLE public.categories ADD COLUMN parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;

-- Create "Pizzas" parent category
INSERT INTO public.categories (name, slug, icon, sort_order, parent_id, active) 
VALUES ('Pizzas', 'pizzas-group', '😋', 0, NULL, true);

-- Set parent_id for pizza subcategories
UPDATE public.categories 
SET parent_id = (SELECT id FROM public.categories WHERE slug = 'pizzas-group')
WHERE slug IN ('pizzas', 'pizzas-doces');

-- Set parent_id for drink subcategories (use existing "Bebidas" as parent)
UPDATE public.categories 
SET parent_id = (SELECT id FROM public.categories WHERE slug = 'bebidas')
WHERE slug IN ('refrigerantes', 'sucos');
