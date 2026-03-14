
-- Add promo_price column to products
ALTER TABLE public.products ADD COLUMN promo_price numeric DEFAULT NULL;

-- Create extra_ingredients table
CREATE TABLE public.extra_ingredients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.extra_ingredients ENABLE ROW LEVEL SECURITY;

-- Anyone can view active extra ingredients
CREATE POLICY "Anyone can view extra ingredients" ON public.extra_ingredients
  FOR SELECT TO public USING (true);

-- Admins can manage extra ingredients
CREATE POLICY "Admins can manage extra ingredients" ON public.extra_ingredients
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
