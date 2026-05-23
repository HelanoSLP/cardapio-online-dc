
-- 1. Explicit deny INSERT on orders for public/authenticated (orders only created via SECURITY DEFINER create_order RPC)
CREATE POLICY "Block direct order inserts"
ON public.orders
FOR INSERT
TO public, authenticated
WITH CHECK (false);

-- 2. Allow users to view their own order items
CREATE POLICY "Users can view items of own orders"
ON public.order_items
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders
    WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
  )
);

-- 3. Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.generate_cashback_coupon(text, numeric) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.use_coupon(uuid) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.get_top_products(integer) FROM anon, authenticated, public;
