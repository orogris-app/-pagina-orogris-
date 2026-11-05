-- OROGRIS V6: soporte privado de recibos de arriendo.
-- Ejecutar DESPUÉS de 20261104_orogris_v6.sql, tras verificar proyecto y RLS.
-- No procesa dinero, no cambia registros existentes y no publica comprobantes.
BEGIN;
ALTER TABLE public.og_rent_payments ADD COLUMN IF NOT EXISTS receipt_path text;

INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES (
 'og-rent-receipts','og-rent-receipts',false,10485760,
 ARRAY['image/jpeg','image/png','image/webp','application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
 public=false,
 file_size_limit=10485760,
 allowed_mime_types=EXCLUDED.allowed_mime_types;

-- El primer segmento del objeto es SIEMPRE el UUID del usuario autenticado.
-- No se concede lectura pública ni se generan URLs públicas.
DROP POLICY IF EXISTS og_rent_receipts_owner_read ON storage.objects;
CREATE POLICY og_rent_receipts_owner_read ON storage.objects
 FOR SELECT TO authenticated
 USING (
   bucket_id='og-rent-receipts'
   AND split_part(name,'/',1)=auth.uid()::text
 );
DROP POLICY IF EXISTS og_rent_receipts_owner_upload ON storage.objects;
CREATE POLICY og_rent_receipts_owner_upload ON storage.objects
 FOR INSERT TO authenticated
 WITH CHECK (
   bucket_id='og-rent-receipts'
   AND split_part(name,'/',1)=auth.uid()::text
 );
COMMIT;
