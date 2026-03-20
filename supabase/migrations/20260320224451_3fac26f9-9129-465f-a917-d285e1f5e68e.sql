CREATE POLICY "Shipments deletable by authenticated"
ON public.shipments
FOR DELETE
TO authenticated
USING (true);