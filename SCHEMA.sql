-- =============================================================================
-- CIVICLENS — DATABASE SCHEMA & RLS POLICIES (Canonical State)
-- Apply in Supabase SQL Editor in blocks if a full run fails.
-- CREATE TABLE IF NOT EXISTS will not add columns to existing tables —
-- use the ALTER TABLE statements below for live DBs.
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
  status               text NOT NULL DEFAULT 'Unresolved'
                         CHECK (status IN ('Unresolved', 'In Progress', 'Resolved')),
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
  location_trust       text DEFAULT 'verified_gps'
                         CHECK (location_trust IN ('verified_gps', 'self_reported')),
  reporter_fingerprint text DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.ward_analytics (
  id              integer PRIMARY KEY,
  ward_name       text NOT NULL,
  zone_name       text NOT NULL,
  councillor_name text NOT NULL DEFAULT 'Vacant',
  open_count      integer NOT NULL DEFAULT 0,
  resolution_rate numeric,
  avg_days        numeric NOT NULL DEFAULT 0,
  sla_breaches    integer NOT NULL DEFAULT 0,
  recorded_at     timestamptz DEFAULT now()
);

-- Live DB may already exist without these:
ALTER TABLE public.ward_analytics
  ADD COLUMN IF NOT EXISTS recorded_at timestamptz DEFAULT now();

ALTER TABLE public.ward_analytics
  ALTER COLUMN councillor_name SET DEFAULT 'Vacant';

UPDATE public.ward_analytics
SET councillor_name = 'Vacant'
WHERE councillor_name IS NULL;

ALTER TABLE public.ward_analytics
  ALTER COLUMN resolution_rate DROP NOT NULL,
  ALTER COLUMN resolution_rate DROP DEFAULT;

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

DROP POLICY IF EXISTS "Public Read Complaints" ON public.complaints;
CREATE POLICY "Public Read Complaints"
  ON public.complaints FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public Insert Complaints" ON public.complaints;
CREATE POLICY "Public Insert Complaints"
  ON public.complaints
  FOR INSERT
  TO public
  WITH CHECK (
    status = 'Unresolved'
    AND upvote_count = 1
    AND assigned_official IS NULL
    AND resolved_at IS NULL
    AND fixed_at IS NULL
    AND fix_photo_url IS NULL
    AND sla_deadline IS NULL
    AND (location_trust IS NULL OR location_trust IN ('verified_gps', 'self_reported'))
  );

DROP POLICY IF EXISTS "Public Update Complaints" ON public.complaints;

DROP POLICY IF EXISTS "Public Read Ward Analytics" ON public.ward_analytics;
CREATE POLICY "Public Read Ward Analytics"
  ON public.ward_analytics FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public Read Ward History" ON public.ward_history;
CREATE POLICY "Public Read Ward History"
  ON public.ward_history FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public Read Upvotes" ON public.upvotes;
CREATE POLICY "Public Read Upvotes"
  ON public.upvotes FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Public Insert Upvotes" ON public.upvotes;
CREATE POLICY "Public Insert Upvotes"
  ON public.upvotes FOR INSERT TO public WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 3. WARD STATS
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.perform_ward_stat_refresh(target_ward_id int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _stats record;
BEGIN
  IF target_ward_id IS NULL THEN RETURN; END IF;

  SELECT
    COUNT(*) FILTER (WHERE status <> 'Resolved') AS open_cnt,
    CASE
      WHEN COUNT(*) > 0
      THEN round(100.0 * COUNT(*) FILTER (WHERE status = 'Resolved') / COUNT(*), 2)
      ELSE NULL
    END AS res_rate,
    round(
      COALESCE(
        AVG(
          EXTRACT(EPOCH FROM (COALESCE(resolved_at, fixed_at, now()) - created_at)) / 86400
        )::numeric,
        0
      ),
      1
    ) AS avg_d,
    COUNT(*) FILTER (
      WHERE status <> 'Resolved' AND created_at < now() - INTERVAL '7 days'
    ) AS sla_br
  INTO _stats
  FROM public.complaints
  WHERE ward_id = target_ward_id;

  INSERT INTO public.ward_analytics (
    id, ward_name, zone_name, councillor_name,
    open_count, resolution_rate, avg_days, sla_breaches, recorded_at
  )
  VALUES (
    target_ward_id,
    'Ward ' || target_ward_id,
    'Zone ' || COALESCE(
      (SELECT zone_num FROM public.complaints WHERE ward_id = target_ward_id LIMIT 1),
      0
    ),
    'Vacant',
    _stats.open_cnt,
    _stats.res_rate,
    _stats.avg_d,
    _stats.sla_br,
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    open_count      = EXCLUDED.open_count,
    resolution_rate = EXCLUDED.resolution_rate,
    avg_days        = EXCLUDED.avg_days,
    sla_breaches    = EXCLUDED.sla_breaches,
    recorded_at     = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.refresh_ward_stats_from_complaints()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

-- -----------------------------------------------------------------------------
-- 4. UPVOTES — one SECURITY DEFINER trigger (INSERT +1, DELETE -1)
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS trg_upvotes_increment ON public.upvotes;
DROP TRIGGER IF EXISTS trigger_update_upvote_count ON public.upvotes;
DROP TRIGGER IF EXISTS trg_sync_upvote_count ON public.upvotes;
DROP FUNCTION IF EXISTS public.trg_upvote_increment_count();
DROP FUNCTION IF EXISTS public.update_upvote_count();

CREATE OR REPLACE FUNCTION public.sync_upvote_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.complaints
       SET upvote_count = upvote_count + 1
     WHERE id = NEW.complaint_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.complaints
       SET upvote_count = GREATEST(upvote_count - 1, 0)
     WHERE id = OLD.complaint_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_upvote_count
  AFTER INSERT OR DELETE ON public.upvotes
  FOR EACH ROW EXECUTE FUNCTION public.sync_upvote_count();

-- Repair counts inflated by the old double trigger (seed upvote_count = 1).
-- Run this only after perform_ward_stat_refresh includes councillor_name.
UPDATE public.complaints c
SET upvote_count = 1 + COALESCE(
  (SELECT COUNT(*) FROM public.upvotes u WHERE u.complaint_id = c.id),
  0
);

-- -----------------------------------------------------------------------------
-- 5. STORAGE (lives on storage.objects, not public.*)
-- Bucket: complaint-photos, PUBLIC.
-- SELECT policy "Public can view photos":
--   bucket_id = 'complaint-photos'
-- INSERT policy "Strict public photo upload":
--   bucket_id = 'complaint-photos'
--   AND (storage.foldername(name))[1] = 'before'
--   AND lower(name) LIKE '%.webp'
--   AND COALESCE((metadata->>'size')::int, 0) <= 5242880
-- Public client uploads only to before/. Size is also enforced in storage.ts.
-- -----------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Officer portal (not built yet):
-- Public role has SELECT + INSERT on complaints only. No public UPDATE.
-- markComplaintFixed / status→Resolved must run as a privileged role
-- (service role or authenticated officer) after portal auth exists.
-- ---------------------------------------------------------------------------