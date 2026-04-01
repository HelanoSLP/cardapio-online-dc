
ALTER TABLE public.products
ADD COLUMN cashback_active boolean NOT NULL DEFAULT false,
ADD COLUMN cashback_percent numeric NOT NULL DEFAULT 0;
