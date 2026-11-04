-- OROGRIS V6.0: ejecutar en Supabase SQL Editor SOLO después de revisar.
-- No borra ni modifica la tabla public.properties ni su almacenamiento.
-- Sin datos de prueba. Toda información de arrendatarios y reservas queda privada.
BEGIN;

CREATE TABLE IF NOT EXISTS public.og_rentals (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL DEFAULT auth.uid(),
 property_id uuid,
 title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 180),
 city text NOT NULL DEFAULT '',
 description text NOT NULL DEFAULT '',
 photos jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(photos)='array'),
 rental_mode text NOT NULL DEFAULT 'mixto' CHECK (rental_mode IN ('dias','meses','tradicional','mixto')),
 nightly_rate numeric(14,2) CHECK (nightly_rate IS NULL OR nightly_rate>=0),
 weekend_rate numeric(14,2) CHECK (weekend_rate IS NULL OR weekend_rate>=0),
 monthly_rate numeric(14,2) CHECK (monthly_rate IS NULL OR monthly_rate>=0),
 published boolean NOT NULL DEFAULT false,
 active boolean NOT NULL DEFAULT true,
 contract_starts date,
 contract_ends date,
 tenant_name text,
 tenant_phone text,
 due_day integer CHECK (due_day BETWEEN 1 AND 31),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS og_rentals_owner_idx ON public.og_rentals(owner_id);
ALTER TABLE public.og_rentals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS og_rentals_owner_manage ON public.og_rentals;
CREATE POLICY og_rentals_owner_manage ON public.og_rentals FOR ALL TO authenticated
 USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
DROP POLICY IF EXISTS og_rentals_public_read ON public.og_rentals;
CREATE POLICY og_rentals_public_read ON public.og_rentals FOR SELECT TO anon,authenticated
 USING (published=true AND active=true);
-- ATENCIÓN: La política de lectura pública anterior aplicaría a toda la fila,
-- incluidos tenant_name y tenant_phone. Se elimina y se sustituye por una vista restringida.
DROP POLICY IF EXISTS og_rentals_public_read ON public.og_rentals;
CREATE OR REPLACE VIEW public.og_rentals_public WITH (security_invoker = true) AS
 SELECT id,owner_id,title,city,description,photos,rental_mode,nightly_rate,weekend_rate,monthly_rate
 FROM public.og_rentals WHERE published=true AND active=true;
-- Para que la vista security_invoker funcione con RLS sin abrir los datos privados:
-- función SECURITY DEFINER que expone únicamente columnas comerciales y valida publicación.
DROP VIEW IF EXISTS public.og_rentals_public;
CREATE OR REPLACE FUNCTION public.og_public_rentals()
RETURNS TABLE(id uuid,owner_id uuid,title text,city text,description text,photos jsonb,rental_mode text,nightly_rate numeric,weekend_rate numeric,monthly_rate numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT r.id,r.owner_id,r.title,r.city,r.description,r.photos,r.rental_mode,r.nightly_rate,r.weekend_rate,r.monthly_rate
 FROM public.og_rentals r WHERE r.published AND r.active
$$;
REVOKE ALL ON FUNCTION public.og_public_rentals() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.og_public_rentals() TO anon,authenticated;

CREATE TABLE IF NOT EXISTS public.og_reservations (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL,
 rental_id uuid NOT NULL REFERENCES public.og_rentals(id) ON DELETE RESTRICT,
 check_in date NOT NULL,
 check_out date NOT NULL CHECK(check_out>check_in),
 guest_name text NOT NULL CHECK (char_length(guest_name) BETWEEN 2 AND 120),
 guest_phone text NOT NULL CHECK (char_length(guest_phone) BETWEEN 7 AND 25),
 status text NOT NULL DEFAULT 'pendiente' CHECK (status IN ('pendiente','confirmada','cancelada')),
 total_cop numeric(14,2) NOT NULL DEFAULT 0 CHECK(total_cop>=0),
 deposit_cop numeric(14,2) NOT NULL DEFAULT 0 CHECK(deposit_cop>=0),
 notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS og_reservations_owner_idx ON public.og_reservations(owner_id,check_in);
CREATE INDEX IF NOT EXISTS og_reservations_dates_idx ON public.og_reservations(rental_id,check_in,check_out);
ALTER TABLE public.og_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS og_reservations_owner_manage ON public.og_reservations;
CREATE POLICY og_reservations_owner_manage ON public.og_reservations FOR ALL TO authenticated
 USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
DROP POLICY IF EXISTS og_reservations_public_insert ON public.og_reservations;
CREATE POLICY og_reservations_public_insert ON public.og_reservations FOR INSERT TO anon,authenticated
 WITH CHECK (
   status='pendiente' AND total_cop=0 AND deposit_cop=0 AND char_length(notes)=0
   AND EXISTS (SELECT 1 FROM public.og_rentals r WHERE r.id=rental_id AND r.owner_id=og_reservations.owner_id AND r.published AND r.active)
 );
-- Previene la confirmación simultánea de dos reservas para las mismas noches.
CREATE EXTENSION IF NOT EXISTS btree_gist;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='og_confirmed_no_overlap') THEN
  ALTER TABLE public.og_reservations ADD CONSTRAINT og_confirmed_no_overlap
  EXCLUDE USING gist (rental_id WITH =, daterange(check_in,check_out,'[)') WITH &&)
  WHERE (status='confirmada');
 END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.og_rent_payments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL DEFAULT auth.uid(),
 rental_id uuid NOT NULL REFERENCES public.og_rentals(id) ON DELETE RESTRICT,
 period text NOT NULL CHECK (period ~ '^\\d{4}-\\d{2}$'),
 due_on date NOT NULL,
 amount_due numeric(14,2) NOT NULL CHECK(amount_due>=0),
 amount_paid numeric(14,2) NOT NULL DEFAULT 0 CHECK(amount_paid>=0),
 paid_on date,
 notes text NOT NULL DEFAULT '',
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS og_rent_payments_owner_idx ON public.og_rent_payments(owner_id,rental_id);
ALTER TABLE public.og_rent_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS og_rent_payments_owner_manage ON public.og_rent_payments;
CREATE POLICY og_rent_payments_owner_manage ON public.og_rent_payments FOR ALL TO authenticated
 USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());

CREATE TABLE IF NOT EXISTS public.og_vehicles (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_id uuid NOT NULL DEFAULT auth.uid(),
 title text NOT NULL,
 brand text NOT NULL DEFAULT '',
 model text NOT NULL DEFAULT '',
 year integer CHECK(year BETWEEN 1950 AND 2100),
 mileage integer CHECK(mileage IS NULL OR mileage>=0),
 price numeric(15,2) CHECK(price IS NULL OR price>=0),
 city text NOT NULL DEFAULT '',
 description text NOT NULL DEFAULT '',
 photos jsonb NOT NULL DEFAULT '[]'::jsonb,
 published boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS og_vehicles_owner_idx ON public.og_vehicles(owner_id);
ALTER TABLE public.og_vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS og_vehicles_owner_manage ON public.og_vehicles;
CREATE POLICY og_vehicles_owner_manage ON public.og_vehicles FOR ALL TO authenticated
 USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
-- Igual que arriendos: la lectura pública de vehículos usa RPC de columnas explícitas.
CREATE OR REPLACE FUNCTION public.og_public_vehicles()
RETURNS TABLE(id uuid,title text,brand text,model text,year integer,mileage integer,price numeric,city text,description text,photos jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT v.id,v.title,v.brand,v.model,v.year,v.mileage,v.price,v.city,v.description,v.photos
 FROM public.og_vehicles v WHERE v.published
$$;
REVOKE ALL ON FUNCTION public.og_public_vehicles() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.og_public_vehicles() TO anon,authenticated;

CREATE TABLE IF NOT EXISTS public.og_visits (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 owner_id uuid NOT NULL,
 page_type text NOT NULL CHECK(page_type IN ('catalogo','propiedad','arriendos','vehiculos')),
 property_id uuid,
 visitor_key uuid NOT NULL,
 visit_day date NOT NULL DEFAULT CURRENT_DATE,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS og_visits_owner_day_idx ON public.og_visits(owner_id,visit_day);
ALTER TABLE public.og_visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS og_visits_owner_read ON public.og_visits;
CREATE POLICY og_visits_owner_read ON public.og_visits FOR SELECT TO authenticated USING(owner_id=auth.uid());
DROP POLICY IF EXISTS og_visits_public_insert ON public.og_visits;
CREATE POLICY og_visits_public_insert ON public.og_visits FOR INSERT TO anon,authenticated
 WITH CHECK (EXISTS (
 SELECT 1 FROM public.properties p
 WHERE p.owner_id=og_visits.owner_id AND p.status='Publicado'
   AND (og_visits.property_id IS NULL OR p.id=og_visits.property_id)
 ));
CREATE UNIQUE INDEX IF NOT EXISTS og_visits_dedup_idx ON public.og_visits
 (owner_id,page_type,COALESCE(property_id,'00000000-0000-0000-0000-000000000000'::uuid),visitor_key,visit_day);

-- Evita el acceso accidental a datos privados sin token autenticado.
REVOKE ALL ON public.og_rentals,public.og_reservations,public.og_rent_payments,public.og_vehicles,public.og_visits FROM anon;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.og_rentals,public.og_reservations,public.og_rent_payments,public.og_vehicles TO authenticated;
GRANT SELECT,INSERT ON public.og_visits TO authenticated;
GRANT INSERT ON public.og_reservations,public.og_visits TO anon;
GRANT USAGE,SELECT ON SEQUENCE public.og_visits_id_seq TO anon,authenticated;
COMMIT;
