
-- Function to validate a coupon by code and whatsapp (bypasses RLS)
CREATE OR REPLACE FUNCTION public.validate_coupon(p_code text, p_whatsapp text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_coupon RECORD;
BEGIN
  SELECT id, discount_value, used, expires_at, customer_whatsapp
  INTO v_coupon
  FROM public.coupons
  WHERE code = upper(trim(p_code))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupom não encontrado');
  END IF;

  IF v_coupon.used THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupom já utilizado');
  END IF;

  IF v_coupon.expires_at IS NOT NULL AND v_coupon.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupom expirado');
  END IF;

  IF v_coupon.customer_whatsapp != trim(p_whatsapp) THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cupom não pertence a este número');
  END IF;

  RETURN jsonb_build_object('valid', true, 'id', v_coupon.id, 'discount_value', v_coupon.discount_value);
END;
$$;

-- Function to use a coupon and optionally generate cashback
CREATE OR REPLACE FUNCTION public.use_coupon(p_coupon_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.coupons SET used = true, used_at = now() WHERE id = p_coupon_id AND used = false;
END;
$$;

-- Function to generate a cashback coupon
CREATE OR REPLACE FUNCTION public.generate_cashback_coupon(p_whatsapp text, p_discount numeric)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_code text;
BEGIN
  v_code := 'CB' || upper(to_hex(extract(epoch from now())::bigint));
  INSERT INTO public.coupons (code, customer_whatsapp, discount_value, expires_at)
  VALUES (v_code, trim(p_whatsapp), p_discount, now() + interval '30 days');
  RETURN v_code;
END;
$$;
