
CREATE OR REPLACE FUNCTION public.get_top_products(p_limit int DEFAULT 5)
RETURNS TABLE(product_id uuid, total_qty bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT oi.product_id, SUM(oi.quantity)::bigint AS total_qty
  FROM public.order_items oi
  JOIN public.orders o ON o.id = oi.order_id
  WHERE oi.product_id IS NOT NULL
    AND o.created_at > now() - interval '30 days'
  GROUP BY oi.product_id
  ORDER BY total_qty DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_top_products(int) TO anon, authenticated;
