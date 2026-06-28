-- ============================================================
-- NolleDansa – Migration v2
-- Kör detta i Supabase > SQL Editor
-- ============================================================

-- 1. Lägg till status-kolumn på dances
ALTER TABLE public.dances
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending'
  CHECK (status IN ('pending', 'approved', 'rejected'));

ALTER TABLE public.dances
  ADD COLUMN IF NOT EXISTS organization text NOT NULL DEFAULT 'Nollningen'
  CHECK (organization IN ('Nollningen', 'Sexmästeriet', 'Festmästeriet', 'Phusk'));

ALTER TABLE public.dances
  DROP CONSTRAINT IF EXISTS dances_organization_check;

ALTER TABLE public.dances
  ADD CONSTRAINT dances_organization_check
  CHECK (organization IN ('Nollningen', 'Sexmästeriet', 'Festmästeriet', 'Phusk'));

ALTER TABLE public.dances
  ADD COLUMN IF NOT EXISTS dancer_names text NOT NULL DEFAULT '';

-- Sätt befintliga danser till approved (om du kört schema v1)
UPDATE public.dances SET status = 'approved' WHERE status IS NULL OR status = 'pending';
UPDATE public.dances SET organization = 'Nollningen' WHERE organization IS NULL;
UPDATE public.dances SET dancer_names = '' WHERE dancer_names IS NULL;

-- 2. Uppdatera RLS för dances -----------------------------------------

-- Ta bort gamla policies
DROP POLICY IF EXISTS "Anyone can view dances" ON public.dances;
DROP POLICY IF EXISTS "Authenticated users can insert dances" ON public.dances;
DROP POLICY IF EXISTS "Anyone can insert pending dance" ON public.dances;

-- Säkerställ att RLS är aktivt
ALTER TABLE public.dances ENABLE ROW LEVEL SECURITY;

-- Rensa alla befintliga INSERT/SELECT-policies på dances så migrationen blir deterministisk
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'dances'
      AND cmd IN ('SELECT', 'INSERT')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.dances', p.policyname);
  END LOOP;
END $$;

-- Alla kan läsa approved danser
DROP POLICY IF EXISTS "Public can view approved dances" ON public.dances;
CREATE POLICY "Public can view approved dances"
  ON public.dances FOR SELECT
  USING (status = 'approved');

-- Vem som helst kan ladda upp en dans med status 'pending'
DROP POLICY IF EXISTS "Anyone can insert pending dance" ON public.dances;
CREATE POLICY "Anyone can insert pending dance"
  ON public.dances FOR INSERT
  WITH CHECK (status = 'pending');

-- Ägare kan fortfarande uppdatera sina egna danser (om de är inloggade)
-- Befintlig policy "Owner can update their dance" behålls

-- 3. Uppdatera RLS för dance_segments -----------------------------------

-- Ta bort gamla policyn som krävde auth
DROP POLICY IF EXISTS "Owner can insert segments" ON public.dance_segments;

-- Rensa alla befintliga INSERT/SELECT-policies på dance_segments för att undvika gamla konflikter
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'dance_segments'
      AND cmd IN ('SELECT', 'INSERT')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.dance_segments', p.policyname);
  END LOOP;
END $$;

-- Tillåt insättning av segment för alla (anonyma uppladdare inkl.)
DROP POLICY IF EXISTS "Anyone can insert segments" ON public.dance_segments;
CREATE POLICY "Anyone can insert segments"
  ON public.dance_segments FOR INSERT
  WITH CHECK (true);

-- 4. Uppdatera Storage-policy för anonyma uppladdningar ----------------

DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload to dance-videos" ON storage.objects;

-- Rensa alla befintliga INSERT-policies för storage.objects i dance-videos
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', p.policyname);
  END LOOP;
END $$;

CREATE POLICY "Anyone can upload to dance-videos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'dance-videos');

-- 5. RLS för dance_segments SELECT: visa bara segment för approved danser
DROP POLICY IF EXISTS "Anyone can view segments" ON public.dance_segments;
DROP POLICY IF EXISTS "Public can view segments for approved dances" ON public.dance_segments;

CREATE POLICY "Public can view segments for approved dances"
  ON public.dance_segments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.dances
      WHERE id = dance_id AND status = 'approved'
    )
  );

-- 6. Ändringsförslag för befintliga danser -----------------------------

CREATE TABLE IF NOT EXISTS public.dance_edit_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  dance_id uuid NOT NULL REFERENCES public.dances(id) ON DELETE CASCADE,
  title text NOT NULL,
  section text NOT NULL,
  year text NOT NULL,
  song_title text NOT NULL,
  dancer_names text NOT NULL DEFAULT '',
  artist text,
  spotify_url text,
  thumbnail_url text,
  requester_note text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'rejected')),
  resolved_at timestamptz
);

ALTER TABLE public.dance_edit_requests
  ADD COLUMN IF NOT EXISTS thumbnail_url text;

ALTER TABLE public.dance_edit_requests
  ADD COLUMN IF NOT EXISTS dancer_names text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS public.dance_edit_request_segments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.dance_edit_requests(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  start_time numeric NOT NULL,
  end_time numeric NOT NULL,
  sort_order integer NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_dance_edit_requests_dance_id
  ON public.dance_edit_requests(dance_id);

CREATE INDEX IF NOT EXISTS idx_dance_edit_request_segments_request_id
  ON public.dance_edit_request_segments(request_id);

ALTER TABLE public.dance_edit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dance_edit_request_segments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert edit requests" ON public.dance_edit_requests;
DROP POLICY IF EXISTS "Anyone can insert edit request segments" ON public.dance_edit_request_segments;

CREATE POLICY "Anyone can insert edit requests"
  ON public.dance_edit_requests FOR INSERT
  WITH CHECK (status = 'pending');

CREATE POLICY "Anyone can insert edit request segments"
  ON public.dance_edit_request_segments FOR INSERT
  WITH CHECK (true);

-- 7. Klickspårning för Trending ---------------------------------------

ALTER TABLE public.dance_clicks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can insert click" ON public.dance_clicks;
DROP POLICY IF EXISTS "Anyone can view clicks" ON public.dance_clicks;

CREATE POLICY "Anyone can insert click"
  ON public.dance_clicks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can view clicks"
  ON public.dance_clicks FOR SELECT
  USING (true);

-- ============================================================
-- KLAR
-- Admin-operationer (approve/reject) görs via service role key
-- från server-side API-routes, vilket kringgår RLS.
-- ============================================================
