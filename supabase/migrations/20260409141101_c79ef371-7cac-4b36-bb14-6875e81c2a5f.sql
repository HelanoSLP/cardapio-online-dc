
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
  p_items jsonb DEFAULT '[]',
  p_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order_id uuid;
  v_order_number integer;
  v_item jsonb;
  v_item_quantity integer;
  v_item_price numeric;
BEGIN
  IF p_customer_name IS NULL OR length(trim(p_customer_name)) = 0 THEN
    RAISE EXCEPTION 'Customer name is required';
  END IF;
  IF length(p_customer_name) > 100 THEN
    RAISE EXCEPTION 'Customer name must be 100 characters or less';
  END IF;
  IF p_customer_whatsapp IS NULL OR length(trim(p_customer_whatsapp)) = 0 THEN
    RAISE EXCEPTION 'Customer WhatsApp is required';
  END IF;
  IF length(p_customer_whatsapp) > 20 THEN
    RAISE EXCEPTION 'WhatsApp number must be 20 characters or less';
  END IF;
  IF p_address_street IS NULL OR length(trim(p_address_street)) = 0 THEN
    RAISE EXCEPTION 'Street address is required';
  END IF;
  IF length(p_address_street) > 200 THEN
    RAISE EXCEPTION 'Street address must be 200 characters or less';
  END IF;
  IF p_address_number IS NULL OR length(trim(p_address_number)) = 0 THEN
    RAISE EXCEPTION 'Address number is required';
  END IF;
  IF length(p_address_number) > 20 THEN
    RAISE EXCEPTION 'Address number must be 20 characters or less';
  END IF;
  IF p_address_neighborhood IS NULL OR length(trim(p_address_neighborhood)) = 0 THEN
    RAISE EXCEPTION 'Neighborhood is required';
  END IF;
  IF length(p_address_neighborhood) > 200 THEN
    RAISE EXCEPTION 'Neighborhood must be 200 characters or less';
  END IF;
  IF p_address_reference IS NOT NULL AND length(p_address_reference) > 200 THEN
    RAISE EXCEPTION 'Address reference must be 200 characters or less';
  END IF;
  IF p_notes IS NOT NULL AND length(p_notes) > 500 THEN
    RAISE EXCEPTION 'Notes must be 500 characters or less';
  END IF;
  IF p_total IS NULL OR p_total <= 0 THEN
    RAISE EXCEPTION 'Order total must be greater than zero';
  END IF;
  IF p_total > 100000 THEN
    RAISE EXCEPTION 'Order total exceeds maximum allowed value';
  END IF;
  IF p_change_for IS NOT NULL AND p_change_for < p_total THEN
    RAISE EXCEPTION 'Change amount must be greater than or equal to total';
  END IF;
  IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'Order must contain at least one item';
  END IF;
  IF jsonb_array_length(p_items) > 50 THEN
    RAISE EXCEPTION 'Order cannot contain more than 50 items';
  END IF;

  INSERT INTO orders (customer_name, customer_whatsapp, address_street, address_number, address_neighborhood, address_reference, notes, payment_method, change_for, total, user_id)
  VALUES (trim(p_customer_name), trim(p_customer_whatsapp), trim(p_address_street), trim(p_address_number), trim(p_address_neighborhood), trim(p_address_reference), trim(p_notes), p_payment_method, p_change_for, p_total, p_user_id)
  RETURNING id, order_number INTO v_order_id, v_order_number;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    IF v_item->>'product_name' IS NULL OR length(trim(v_item->>'product_name')) = 0 THEN
      RAISE EXCEPTION 'Each item must have a product name';
    END IF;
    IF length(v_item->>'product_name') > 200 THEN
      RAISE EXCEPTION 'Product name must be 200 characters or less';
    END IF;
    v_item_quantity := COALESCE((v_item->>'quantity')::integer, 1);
    IF v_item_quantity <= 0 OR v_item_quantity > 99 THEN
      RAISE EXCEPTION 'Item quantity must be between 1 and 99';
    END IF;
    v_item_price := (v_item->>'unit_price')::numeric;
    IF v_item_price IS NULL OR v_item_price <= 0 THEN
      RAISE EXCEPTION 'Item unit price must be greater than zero';
    END IF;
    IF v_item_price > 10000 THEN
      RAISE EXCEPTION 'Item unit price exceeds maximum allowed value';
    END IF;
    IF v_item->>'notes' IS NOT NULL AND length(v_item->>'notes') > 500 THEN
      RAISE EXCEPTION 'Item notes must be 500 characters or less';
    END IF;
    INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, notes)
    VALUES (
      v_order_id,
      CASE WHEN v_item->>'product_id' = '' OR v_item->>'product_id' IS NULL THEN NULL ELSE (v_item->>'product_id')::uuid END,
      trim(v_item->>'product_name'),
      v_item_quantity,
      v_item_price,
      trim(v_item->>'notes')
    );
  END LOOP;

  RETURN jsonb_build_object('id', v_order_id, 'order_number', v_order_number);
END;
$$;
