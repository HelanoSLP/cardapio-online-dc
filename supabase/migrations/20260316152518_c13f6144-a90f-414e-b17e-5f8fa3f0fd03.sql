
-- Drop insecure policies on coupons
DROP POLICY IF EXISTS "Anyone can view own coupons by whatsapp" ON public.coupons;
DROP POLICY IF EXISTS "Anyone can update coupons" ON public.coupons;
DROP POLICY IF EXISTS "Anyone can insert coupons" ON public.coupons;

-- Only admins can insert coupons
CREATE POLICY "Only admins can insert coupons"
ON public.coupons FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update coupons
CREATE POLICY "Only admins can update coupons"
ON public.coupons FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can view coupons
CREATE POLICY "Only admins can view coupons"
ON public.coupons FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
