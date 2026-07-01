-- ================================================================
-- RESEARCH MIGRATION - MedSync AI Evaluation Framework
-- Run this in Supabase SQL Editor (once, safe to re-run)
-- ================================================================

-- ----------------------------------------------------------------
-- 1. appointments table — blind validation + correction columns
-- ----------------------------------------------------------------

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS doctor_own_assessment text
    CHECK (doctor_own_assessment IN ('routine', 'urgent', 'emergency'));

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS ai_triage_correction text
    CHECK (ai_triage_correction IN ('routine', 'urgent', 'emergency'));

-- ----------------------------------------------------------------
-- 2. ai_triage_sessions table — confidence + session analytics
-- ----------------------------------------------------------------

ALTER TABLE public.ai_triage_sessions
  ADD COLUMN IF NOT EXISTS triage_confidence integer
    CHECK (triage_confidence BETWEEN 0 AND 100);

ALTER TABLE public.ai_triage_sessions
  ADD COLUMN IF NOT EXISTS message_count integer;

ALTER TABLE public.ai_triage_sessions
  ADD COLUMN IF NOT EXISTS session_duration_seconds integer;

ALTER TABLE public.ai_triage_sessions
  ADD COLUMN IF NOT EXISTS completed boolean DEFAULT false;

-- ----------------------------------------------------------------
-- 3. sus_responses table — System Usability Scale (Brooke 1996)
-- ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sus_responses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  triage_session_id   uuid REFERENCES public.ai_triage_sessions(id) ON DELETE SET NULL,
  user_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  q1  integer NOT NULL CHECK (q1  BETWEEN 1 AND 5),
  q2  integer NOT NULL CHECK (q2  BETWEEN 1 AND 5),
  q3  integer NOT NULL CHECK (q3  BETWEEN 1 AND 5),
  q4  integer NOT NULL CHECK (q4  BETWEEN 1 AND 5),
  q5  integer NOT NULL CHECK (q5  BETWEEN 1 AND 5),
  q6  integer NOT NULL CHECK (q6  BETWEEN 1 AND 5),
  q7  integer NOT NULL CHECK (q7  BETWEEN 1 AND 5),
  q8  integer NOT NULL CHECK (q8  BETWEEN 1 AND 5),
  q9  integer NOT NULL CHECK (q9  BETWEEN 1 AND 5),
  q10 integer NOT NULL CHECK (q10 BETWEEN 1 AND 5),
  sus_score           numeric(5,2) NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------
-- 4. Row Level Security for sus_responses
-- ----------------------------------------------------------------

ALTER TABLE public.sus_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own SUS response"  ON public.sus_responses;
DROP POLICY IF EXISTS "Users can read own SUS response"    ON public.sus_responses;
DROP POLICY IF EXISTS "Admins can read all SUS responses"  ON public.sus_responses;

CREATE POLICY "Users can insert own SUS response"
  ON public.sus_responses FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own SUS response"
  ON public.sus_responses FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can read all SUS responses"
  ON public.sus_responses FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );

-- ----------------------------------------------------------------
-- 5. Indexes for analytics queries
-- ----------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_appointments_doctor_own_assessment
  ON public.appointments(doctor_own_assessment)
  WHERE doctor_own_assessment IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_triage_sessions_confidence
  ON public.ai_triage_sessions(triage_confidence)
  WHERE triage_confidence IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_triage_sessions_completed
  ON public.ai_triage_sessions(completed)
  WHERE completed = true;

CREATE INDEX IF NOT EXISTS idx_sus_responses_session
  ON public.sus_responses(triage_session_id);
