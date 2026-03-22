-- Remove overly permissive INSERT policies on orders and order_items
-- The create_order RPC (SECURITY DEFINER) bypasses RLS, so direct INSERT is unnecessary
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;