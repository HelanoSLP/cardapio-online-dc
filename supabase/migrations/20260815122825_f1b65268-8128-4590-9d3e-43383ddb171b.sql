CREATE POLICY "No client access to WhatsApp welcome state"
ON public.whatsapp_welcome_state
AS RESTRICTIVE
FOR ALL
TO public
USING (false)
WITH CHECK (false);