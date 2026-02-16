
CREATE OR REPLACE FUNCTION public.create_order(
  p_customer_name text,
  p_customer_whatsapp text,
  p_address_street text,
  p_address_number text,
  p_address_neighborhood text,
  p_address_reference text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_payment_method payment_method DEFAULT 'pix',
  p_change_for numeric DEFAULT NULL,
  p_total numeric DEFAULT 0,
  p_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order_id uuid;
  v_order_number integer;
  v_item jsonb;
BEGIN
  INSERT INTO orders (customer_name, customer_whatsapp, address_street, address_number, address_neighborhood, address_reference, notes, payment_method, change_for, total)
  VALUES (p_customer_name, p_customer_whatsapp, p_address_street, p_address_number, p_address_neighborhood, p_address_reference, p_notes, p_payment_method, p_change_for, p_total)
  RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, notes)
    VALUES (
      v_order_id,
      CASE WHEN v_item->>'product_id' = '' OR v_item->>'product_id' IS NULL THEN NULL ELSE (v_item->>'product_id')::uuid END,
      v_item->>'product_name',
      COALESCE((v_item->>'quantity')::integer, 1),
      (v_item->>'unit_price')::numeric,
      v_item->>'notes'
    );
  END LOOP;

  RETURN jsonb_build_object('id', v_order_id, 'order_number', v_order_number);
END;
$$;
