
-- Fix orders insert policy to be permissive
DROP POLICY "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Fix order_items insert policy to be permissive
DROP POLICY "Anyone can create order items" ON public.order_items;
CREATE POLICY "Anyone can create order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (true);
