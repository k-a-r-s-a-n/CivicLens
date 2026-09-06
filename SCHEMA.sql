-- =============================================================================
-- CIVICLENS — DATABASE SCHEMA & RLS POLICIES (Canonical State)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. TABLES
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.complaints (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title                text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 200),
  description          text NOT NULL CHECK (char_length(description) BETWEEN 5 AND 2000),
  category             text NOT NULL,
  sub_type             text,
  landmark             text CHECK (landmark IS NULL OR char_length(landmark) <= 300),
  latitude             numeric NOT NULL,
  longitude            numeric NOT NULL,
  status               text NOT NULL DEFAULT 'Unresolved' CHECK (status IN ('Unresolved', 'In Progress', 'Resolved')),
  upvote_count         integer NOT NULL DEFAULT 1,
  user_name            text DEFAULT 'Anonymous',
  photo_url            text,
  fix_photo_url        text,
  area                 text NOT NULL,
  assigned_official    text,
  sla_deadline         timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  resolved_at          timestamptz,
  fixed_at             timestamptz,
  ward_id              integer GENERATED ALWAYS AS (
                         CASE 
                           WHEN area ~* '^\s*ward\s*\d{1,3}\s*$' 
                           THEN (regexp_match(area, '\d{1,3}'))[1]::integer 
                           ELSE NULL 
                         END
                       ) STORED,
  zone_num             integer,
  location_trust       text DEFAULT 'verified_gps' CHECK (location_trust IN ('verified_gps', 'self_reported')),
  reporter_fingerprint text DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.ward_analytics (
  id              integer PRIMARY KEY, -- Ward ID (1 to 200)
  ward_name       text NOT NULL,
  zone_name       text NOT NULL,
  councillor_name text NOT NULL DEFAULT 'Vacant',
  open_count      integer NOT NULL DEFAULT 0,
  resolution_rate numeric NOT NULL DEFAULT 0,
  avg_days        numeric NOT NULL DEFAULT 0,
  sla_breaches    integer NOT NULL DEFAULT 0,
  recorded_at     timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ward_history (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id         integer NOT NULL REFERENCES public.ward_analytics(id) ON DELETE CASCADE,
  recorded_at     date NOT NULL DEFAULT CURRENT_DATE,
  open_count      integer NOT NULL DEFAULT 0,
  resolution_rate numeric,
  sla_breaches    integer NOT NULL DEFAULT 0,
  CONSTRAINT unique_ward_history_per_day UNIQUE (ward_id, recorded_at)
);

CREATE TABLE IF NOT EXISTS public.upvotes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id      uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  voter_fingerprint text NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unique_voter_per_complaint UNIQUE (complaint_id, voter_fingerprint)
);

-- -----------------------------------------------------------------------------
-- 2. ROW LEVEL SECURITY (RLS)
-- -----------------------------------------------------------------------------

ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ward_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ward_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upvotes ENABLE ROW LEVEL SECURITY;

-- Complaints: Public Read & Insert ONLY (No public updates)
DROP POLICY IF EXISTS "Public Read Complaints" ON public.complaints;
CREATE POLICY "Public Read Complaints" ON public.complaints FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public Insert Complaints" ON public.complaints;
CREATE POLICY "Public Insert Complaints" ON public.complaints FOR INSERT TO public WITH CHECK (true);

DROP POLICY IF EXISTS "Public Update Complaints" ON public.complaints; -- DROPPED FOR SECURITY

-- Ward Analytics: Public Read ONLY
DROP POLICY IF EXISTS "Public Read Ward Analytics" ON public.ward_analytics;
CREATE POLICY "Public Read Ward Analytics" ON public.ward_analytics FOR SELECT TO public USING (true);

-- Ward History: Public Read ONLY
DROP POLICY IF EXISTS "Public Read Ward History" ON public.ward_history;
CREATE POLICY "Public Read Ward History" ON public.ward_history FOR SELECT TO public USING (true);

-- Upvotes: Public Read & Insert ONLY
DROP POLICY IF EXISTS "Public Read Upvotes" ON public.upvotes;
CREATE POLICY "Public Read Upvotes" ON public.upvotes FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public Insert Upvotes" ON public.upvotes;
CREATE POLICY "Public Insert Upvotes" ON public.upvotes FOR INSERT TO public WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 3. FUNCTIONS & TRIGGERS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.perform_ward_stat_refresh(target_ward_id int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _stats record;
BEGIN
  IF target_ward_id IS NULL THEN RETURN; END IF;

  SELECT 
    COUNT(*) FILTER (WHERE status <> 'Resolved') as open_cnt,
    CASE WHEN COUNT(*) > 0 
         THEN round(100.0 * COUNT(*) FILTER (WHERE status = 'Resolved') / COUNT(*), 2)
         ELSE 0 END as res_rate,
    round(COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, fixed_at, now()) - created_at))/86400)::numeric, 0), 1) as avg_d,
    COUNT(*) FILTER (WHERE status <> 'Resolved' AND created_at < now() - INTERVAL '7 days') as sla_br
  INTO _stats
  FROM public.complaints 
  WHERE ward_id = target_ward_id;

  INSERT INTO public.ward_analytics (id, ward_name, zone_name, open_count, resolution_rate, avg_days, sla_breaches, recorded_at)
  VALUES (
    target_ward_id,
    'Ward ' || target_ward_id,
    'Zone ' || COALESCE((SELECT zone_num FROM public.complaints WHERE ward_id = target_ward_id LIMIT 1), 0),
    _stats.open_cnt,
    _stats.res_rate,
    _stats.avg_d,
    _stats.sla_br,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    open_count       = EXCLUDED.open_count,
    resolution_rate  = EXCLUDED.resolution_rate,
    avg_days         = EXCLUDED.avg_days,
    sla_breaches     = EXCLUDED.sla_breaches,
    recorded_at      = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_ward_stats_from_complaints()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    PERFORM public.perform_ward_stat_refresh(NEW.ward_id);
    IF OLD.ward_id IS DISTINCT FROM NEW.ward_id THEN
      PERFORM public.perform_ward_stat_refresh(OLD.ward_id);
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.perform_ward_stat_refresh(OLD.ward_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_refresh_ward_stats ON public.complaints;
CREATE TRIGGER trg_refresh_ward_stats
  AFTER INSERT OR UPDATE OR DELETE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.refresh_ward_stats_from_complaints();
  -- ---------------------------------------------------------------------------
-- Officer portal (not built yet):
-- Public role has SELECT + INSERT on complaints only. No public UPDATE.
-- markComplaintFixed / status→Resolved must run as a privileged role
-- (service role or authenticated officer) after portal auth exists.
-- ---------------------------------------------------------------------------