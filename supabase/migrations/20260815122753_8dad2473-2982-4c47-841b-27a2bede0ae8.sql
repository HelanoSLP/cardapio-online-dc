CREATE TABLE public.whatsapp_welcome_state (
  phone_key text PRIMARY KEY,
  last_delivered_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT whatsapp_welcome_state_phone_key_format CHECK (phone_key ~ '^[0-9]{10}$')
);

GRANT ALL ON public.whatsapp_welcome_state TO service_role;

ALTER TABLE public.whatsapp_welcome_state ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_whatsapp_welcome_state_updated_at
BEFORE UPDATE ON public.whatsapp_welcome_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.claim_whatsapp_welcome(p_phone text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_digits text;
  v_phone_key text;
  v_latest_delivered_id uuid;
  v_previous_delivered_id uuid;
  v_inserted_phone_key text;
BEGIN
  v_digits := regexp_replace(COALESCE(p_phone, ''), '[^0-9]', '', 'g');

  IF length(v_digits) < 10 OR length(v_digits) > 15 THEN
    RETURN false;
  END IF;

  v_phone_key := right(v_digits, 10);

  SELECT o.id
  INTO v_latest_delivered_id
  FROM public.orders o
  WHERE right(regexp_replace(o.customer_whatsapp, '[^0-9]', '', 'g'), 10) = v_phone_key
    AND o.status = 'delivered'::public.order_status
  ORDER BY o.updated_at DESC, o.created_at DESC
  LIMIT 1;

  INSERT INTO public.whatsapp_welcome_state (phone_key, last_delivered_order_id)
  VALUES (v_phone_key, v_latest_delivered_id)
  ON CONFLICT (phone_key) DO NOTHING
  RETURNING phone_key INTO v_inserted_phone_key;

  IF v_inserted_phone_key IS NOT NULL THEN
    RETURN true;
  END IF;

  SELECT s.last_delivered_order_id
  INTO v_previous_delivered_id
  FROM public.whatsapp_welcome_state s
  WHERE s.phone_key = v_phone_key
  FOR UPDATE;

  IF v_latest_delivered_id IS NOT NULL
     AND v_latest_delivered_id IS DISTINCT FROM v_previous_delivered_id THEN
    UPDATE public.whatsapp_welcome_state
    SET last_delivered_order_id = v_latest_delivered_id
    WHERE phone_key = v_phone_key;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_whatsapp_welcome(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_whatsapp_welcome(text) TO service_role;