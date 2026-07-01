-- =========================================================
-- MEDSYNC DATABASE RESET
-- Run when you want to recreate the database from scratch.
-- =========================================================

begin;

-- =========================================================
-- 0. EXTENSIONS
-- =========================================================

create extension if not exists pgcrypto;

-- =========================================================
-- 1. DROP EXISTING OBJECTS
-- =========================================================

drop trigger if exists on_auth_user_created on auth.users;

-- from most dependent to least dependent
drop table if exists public.patient_files cascade;
drop table if exists public.patient_medical_records cascade;
drop table if exists public.patient_onboarding_reviews cascade;
drop table if exists public.chat_typing cascade;
drop table if exists public.chat_messages cascade;
drop table if exists public.chat_conversations cascade;
drop table if exists public.appointment_notifications cascade;
drop table if exists public.appointment_status_logs cascade;
drop table if exists public.appointments cascade;
drop table if exists public.ai_audit_logs cascade;
drop table if exists public.ai_triage_sessions cascade;
drop table if exists public.doctor_availability cascade;
drop table if exists public.doctor_locations cascade;
drop table if exists public.doctor_services cascade;
drop table if exists public.clinic_locations cascade;
drop table if exists public.clinic_services cascade;
drop table if exists public.clinic_technologies cascade;
drop table if exists public.patient_health_tip_feedback cascade;
drop table if exists public.clinic_health_tips cascade;
drop table if exists public.user_settings cascade;
drop table if exists public.platform_reviews cascade;
drop table if exists public.clinic_memberships cascade;
drop table if exists public.doctors cascade;
drop table if exists public.clinic_details cascade;
drop table if exists public.profiles cascade;
drop table if exists public.clinics cascade;

drop function if exists public.create_appointment_safely(uuid, uuid, uuid, uuid, uuid, date, time, time, text, text, text, text, text, text, text, text, text, uuid, uuid) cascade;
drop function if exists public.handle_new_chat_message() cascade;
drop function if exists public.update_chat_conversation_after_message() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.handle_updated_at() cascade;
drop function if exists public.current_user_role() cascade;
drop function if exists public.is_platform_admin() cascade;
drop function if exists public.is_clinic_admin(uuid) cascade;
drop function if exists public.is_doctor_in_clinic(uuid) cascade;
drop function if exists public.can_access_patient(uuid, uuid) cascade;

drop type if exists public.appointment_notification_type cascade;
drop type if exists public.appointment_status cascade;
drop type if exists public.insurance_method cascade;
drop type if exists public.weekday cascade;
drop type if exists public.clinic_membership_role cascade;
drop type if exists public.app_role cascade;

-- =========================================================
-- 2. ENUMS
-- =========================================================

create type public.app_role as enum (
  'patient',
  'doctor',
  'clinic_admin',
  'platform_admin'
);

create type public.clinic_membership_role as enum (
  'patient',
  'doctor',
  'clinic_admin'
);

create type public.weekday as enum (
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday'
);

create type public.insurance_method as enum (
  'self_pay',
  'public_insurance',
  'private_insurance',
  'other'
);

create type public.appointment_status as enum (
  'scheduled',
  'rescheduled',
  'cancelled',
  'checked_in',
  'missed',
  'completed',
  'archived'
);

create type public.appointment_notification_type as enum (
  'created',
  'rescheduled',
  'cancelled',
  'checked_in',
  'missed',
  'reminder_24h'
);

-- =========================================================
-- 3. CORE TABLES
-- =========================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  username text unique,
  email text unique,
  role public.app_role not null default 'patient',
  active_clinic_id uuid references public.clinics(id) on delete set null,
  phone text,
  birth_date text,
  emergency_contact text,
  avatar_url text,
  gender text,
  blood_type text,
  allergies text,
  chronic_conditions text,
  insurance_provider text,
  insurance_details text,
  address text,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_settings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  email_notifications boolean not null default true,
  appointment_notifications boolean not null default true,
  appointment_reminders boolean not null default true,
  sms_notifications boolean not null default false,
  marketing_emails boolean not null default false,
  dark_mode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.platform_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  name text not null,
  email text,
  review_text text not null,
  rating integer not null default 5 check (rating between 1 and 5),
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique,
  description text,
  primary_color text not null default '#1D4ED8',
  secondary_color text not null default '#0F172A',
  soft_color text not null default '#EFF6FF',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.clinic_memberships (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role public.clinic_membership_role not null,
  is_active boolean not null default true,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint unique_clinic_user unique (clinic_id, profile_id)
);

-- =========================================================
-- 4. CLINIC CONTENT TABLES
-- =========================================================

create table public.clinic_details (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null unique references public.clinics(id) on delete cascade,
  about text,
  address text,
  phone text,
  email text,
  website text,
  opening_hours text,
  emergency_text text,
  hero_title text,
  hero_subtitle text,
  map_embed_url text,
  logo_url text,
  hero_image_url text,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.clinic_locations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  name text not null,
  address text not null,
  city text,
  phone text,
  email text,
  map_embed_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  profile_id uuid references public.profiles(id) on delete set null,
  first_name text not null,
  last_name text not null,
  specialty text,
  bio text,
  experience_years integer,
  phone text,
  email text,
  schedule_text text,
  expertise text,
  memberships text,
  education text,
  experience text,
  avatar_url text,
  cover_image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint unique_doctor_clinic_profile unique (clinic_id, profile_id)
);

create table public.doctor_locations (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  location_id uuid not null references public.clinic_locations(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint unique_doctor_location unique (doctor_id, location_id)
);

create table public.doctor_services (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  service_id uuid not null references public.clinic_services(id) on delete cascade,
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint unique_doctor_service unique (doctor_id, service_id)
);

create table public.doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  location_id uuid not null references public.clinic_locations(id) on delete cascade,
  weekday public.weekday not null,
  start_time time not null,
  end_time time not null,
  slot_minutes integer not null default 30,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.clinic_services (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  title text not null,
  category text,
  description text,
  price_text text,
  duration_minutes integer not null default 30,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.clinic_technologies (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  title text not null,
  category text,
  description text,
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- =========================================================
-- 5. HEALTH TIPS
-- =========================================================

create table public.clinic_health_tips (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  title text not null,
  summary text,
  content text not null,
  category text not null default 'General',
  icon_name text not null default 'leaf-outline',
  min_age integer,
  max_age integer,
  gender_target text,
  condition_tags text[] not null default '{}',
  allergy_tags text[] not null default '{}',
  priority integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.patient_health_tip_feedback (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  tip_id uuid not null references public.clinic_health_tips(id) on delete cascade,
  reaction text not null check (reaction in ('helpful', 'saved', 'done')),
  created_at timestamptz not null default now(),
  constraint unique_tip_feedback unique (profile_id, tip_id, reaction)
);

-- =========================================================
-- 6. APPOINTMENTS / NOTIFICATIONS
-- =========================================================

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  location_id uuid not null references public.clinic_locations(id) on delete restrict,
  doctor_id uuid not null references public.doctors(id) on delete restrict,
  service_id uuid not null references public.clinic_services(id) on delete restrict,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  appointment_date date not null,
  start_time time not null,
  end_time time not null,
  patient_first_name text not null,
  patient_last_name text not null,
  insurance_method public.insurance_method not null default 'self_pay',
  insurance_details text,
  status public.appointment_status not null default 'scheduled',
  reason text,
  notes text,
  ai_triage_summary text,
  ai_triage_level text,
  ai_triage_patient_note text,
  triage_session_id uuid references public.ai_triage_sessions(id) on delete set null,
  cancelled_by uuid references public.profiles(id) on delete set null,
  cancelled_at timestamptz,
  checked_by uuid references public.profiles(id) on delete set null,
  checked_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.appointment_status_logs (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  changed_by uuid references public.profiles(id) on delete set null,
  old_status public.appointment_status,
  new_status public.appointment_status not null,
  message text,
  created_at timestamptz not null default now()
);

create table public.appointment_notifications (
  id uuid primary key default gen_random_uuid(),
  appointment_id uuid references public.appointments(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  type public.appointment_notification_type not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  deep_link text,
  reminder_key text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================================
-- 7. CHAT
-- =========================================================

create table public.chat_conversations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id uuid not null references public.doctors(id) on delete cascade,
  last_message text,
  last_message_at timestamptz,
  patient_unread_count integer not null default 0,
  doctor_unread_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, patient_id, doctor_id)
);

create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  sender_profile_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.chat_typing (
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  is_typing boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

-- =========================================================
-- 8. AI TRIAGE / AUDIT
-- =========================================================

create table public.ai_triage_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  clinic_id uuid references public.clinics(id) on delete set null,
  role text,
  main_symptom text,
  duration text,
  severity integer,
  red_flags jsonb default '[]'::jsonb,
  triage_level text,
  possible_causes jsonb default '[]'::jsonb,
  recommended_service text,
  patient_note text,
  doctor_summary text,
  raw_draft jsonb,
  created_at timestamptz default now()
);

create table public.ai_audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  clinic_id uuid references public.clinics(id) on delete set null,
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- =========================================================
-- 9. MEDICAL DATA
-- =========================================================

create table public.patient_medical_records (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id uuid references public.doctors(id) on delete set null,
  appointment_id uuid unique references public.appointments(id) on delete set null,
  title text,
  category text,
  symptoms text,
  diagnosis text,
  treatment_plan text,
  prescription text,
  recommendations text,
  notes text,
  blood_pressure text,
  heart_rate integer,
  temperature numeric,
  weight_kg numeric,
  height_cm numeric,
  follow_up_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.patient_files (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id uuid references public.doctors(id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  medical_record_id uuid references public.patient_medical_records(id) on delete set null,
  title text not null,
  description text,
  file_url text not null,
  file_type text,
  category text,
  notes text,
  uploaded_by uuid references public.profiles(id) on delete set null,
  extracted_text text,
  ai_summary text,
  processing_status text default 'pending',
  processed_at timestamptz,
  ai_image_summary text,
  ai_image_findings text[] not null default '{}',
  ai_image_flags text[] not null default '{}',
  image_processing_status text,
  image_processed_at timestamptz,
  ai_image_modality text,
  ai_image_body_region text,
  ai_image_quality text,
  ai_image_confidence text,
  ai_image_limitations text[] not null default '{}',
  ai_image_audit jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


create table public.patient_onboarding_reviews (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics(id) on delete cascade,
  appointment_id uuid not null unique references public.appointments(id) on delete cascade,
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id uuid references public.doctors(id) on delete set null,
  form_valid boolean not null default false,
  urgency_level text not null default 'routine',
  summary_for_doctor text,
  missing_information text[] not null default '{}',
  clarifying_questions text[] not null default '{}',
  urgency_flags text[] not null default '{}',
  generated_by uuid references public.profiles(id) on delete set null,
  urgency_flags_structured jsonb not null default '[]'::jsonb,
  completion_score integer,
  requires_manual_review boolean,
  triage_recommendation text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


ALTER TABLE appointments ADD COLUMN IF NOT EXISTS ai_triage_validation text;
ALTER TABLE ai_triage_sessions ADD COLUMN IF NOT EXISTS chatbot_rating text;

-- =========================================================
-- 10. INDEXES
-- =========================================================

create index idx_profiles_role on public.profiles(role);
create index idx_profiles_active_clinic on public.profiles(active_clinic_id);
create index idx_clinic_memberships_profile on public.clinic_memberships(profile_id);
create index idx_clinic_memberships_clinic on public.clinic_memberships(clinic_id);
create index idx_clinic_memberships_role on public.clinic_memberships(role);
create index idx_clinic_locations_clinic on public.clinic_locations(clinic_id);
create index idx_doctors_clinic on public.doctors(clinic_id);
create index idx_doctors_specialty on public.doctors(specialty);
create index idx_doctor_locations_doctor on public.doctor_locations(doctor_id);
create index idx_doctor_locations_location on public.doctor_locations(location_id);
create index idx_clinic_services_clinic on public.clinic_services(clinic_id);
create index idx_doctor_services_doctor on public.doctor_services(doctor_id);
create index idx_doctor_services_service on public.doctor_services(service_id);
create index idx_doctor_services_clinic on public.doctor_services(clinic_id);
create index idx_doctor_availability_doctor on public.doctor_availability(doctor_id);
create index idx_doctor_availability_location on public.doctor_availability(location_id);
create index idx_doctor_availability_weekday on public.doctor_availability(weekday);
create index idx_clinic_health_tips_clinic on public.clinic_health_tips(clinic_id);
create index idx_patient_tip_feedback_profile on public.patient_health_tip_feedback(profile_id);
create index idx_patient_tip_feedback_tip on public.patient_health_tip_feedback(tip_id);
create index idx_appointments_patient on public.appointments(patient_id);
create index idx_appointments_doctor on public.appointments(doctor_id);
create index idx_appointments_clinic on public.appointments(clinic_id);
create index idx_appointments_location on public.appointments(location_id);
create index idx_appointments_date on public.appointments(appointment_date);
create index idx_appointments_status on public.appointments(status);
create index idx_appointment_notifications_recipient on public.appointment_notifications(recipient_id, created_at desc);
create index idx_appointment_notifications_read on public.appointment_notifications(recipient_id, is_read);
create index idx_appointment_notifications_appointment on public.appointment_notifications(appointment_id);
create index idx_appointment_notifications_recipient_active on public.appointment_notifications(recipient_id, archived_at, created_at desc);
create unique index idx_appointment_notifications_reminder_unique on public.appointment_notifications(appointment_id, recipient_id, type, reminder_key) where type = 'reminder_24h';
create index idx_chat_messages_conversation on public.chat_messages(conversation_id, created_at);
create index idx_patient_medical_records_patient on public.patient_medical_records(patient_id);
create index idx_patient_files_patient on public.patient_files(patient_id);
create index idx_patient_files_processing_status on public.patient_files(processing_status);
create index idx_patient_files_image_processing_status on public.patient_files(image_processing_status, image_processed_at desc);
create index idx_patient_onboarding_reviews_appointment on public.patient_onboarding_reviews(appointment_id);
create index idx_patient_onboarding_reviews_clinic_patient on public.patient_onboarding_reviews(clinic_id, patient_id, created_at desc);


-- =========================================================
-- 11. FUNCTIONS
-- =========================================================

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid()
    and p.is_active = true
    and p.deleted_at is null
  limit 1;
$$;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_role() = 'platform_admin', false);
$$;

create or replace function public.is_clinic_admin(p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(exists (
    select 1
    from public.clinic_memberships cm
    where cm.clinic_id = p_clinic_id
      and cm.profile_id = auth.uid()
      and cm.role = 'clinic_admin'
      and cm.is_active = true
  ), false) or public.is_platform_admin();
$$;

create or replace function public.is_doctor_in_clinic(p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(exists (
    select 1
    from public.doctors d
    where d.clinic_id = p_clinic_id
      and d.profile_id = auth.uid()
      and d.is_active = true
  ), false);
$$;

create or replace function public.can_access_patient(p_patient_id uuid, p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    p_patient_id = auth.uid()
    or public.is_platform_admin()
    or public.is_clinic_admin(p_clinic_id)
    or exists (
      select 1
      from public.appointments a
      join public.doctors d on d.id = a.doctor_id
      where a.patient_id = p_patient_id
        and a.clinic_id = p_clinic_id
        and d.profile_id = auth.uid()
        and d.is_active = true
    )
    or exists (
      select 1
      from public.patient_medical_records r
      join public.doctors d on d.id = r.doctor_id
      where r.patient_id = p_patient_id
        and r.clinic_id = p_clinic_id
        and d.profile_id = auth.uid()
        and d.is_active = true
    ),
    false
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, username, email, role)
  values (
    new.id,
    nullif(trim(new.raw_user_meta_data->>'first_name'), ''),
    nullif(trim(new.raw_user_meta_data->>'last_name'), ''),
    lower(nullif(trim(new.raw_user_meta_data->>'username'), '')),
    lower(nullif(trim(new.email), '')),
    'patient'
  )
  on conflict (id) do nothing;

  insert into public.user_settings (profile_id)
  values (new.id)
  on conflict (profile_id) do nothing;

  return new;
exception
  when others then
    raise log 'handle_new_user failed for user %: %', new.id, sqlerrm;
    return new;
end;
$$;

create or replace function public.handle_new_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_patient_id uuid;
  v_doctor_profile_id uuid;
begin
  select cc.patient_id, d.profile_id
  into v_patient_id, v_doctor_profile_id
  from public.chat_conversations cc
  left join public.doctors d on d.id = cc.doctor_id
  where cc.id = new.conversation_id;

  update public.chat_conversations
  set
    last_message = new.body,
    last_message_at = new.created_at,
    updated_at = now(),
    patient_unread_count = case
      when new.sender_profile_id = v_patient_id then patient_unread_count
      else coalesce(patient_unread_count, 0) + 1
    end,
    doctor_unread_count = case
      when new.sender_profile_id = v_doctor_profile_id then doctor_unread_count
      else coalesce(doctor_unread_count, 0) + 1
    end
  where id = new.conversation_id;

  return new;
end;
$$;

create or replace function public.create_appointment_safely(
  p_clinic_id uuid,
  p_location_id uuid,
  p_doctor_id uuid,
  p_service_id uuid,
  p_patient_id uuid,
  p_appointment_date date,
  p_start_time time,
  p_end_time time,
  p_patient_first_name text,
  p_patient_last_name text,
  p_insurance_method text,
  p_insurance_details text,
  p_reason text,
  p_notes text,
  p_ai_triage_patient_note text,
  p_ai_triage_summary text,
  p_ai_triage_level text,
  p_triage_session_id uuid,
  p_created_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_lock_key bigint;
begin
  if p_patient_id <> auth.uid() and not public.is_clinic_admin(p_clinic_id) and not public.is_platform_admin() then
    raise exception 'Not allowed to create this appointment.';
  end if;

  v_lock_key := hashtextextended(
    p_doctor_id::text || ':' || p_location_id::text || ':' || p_appointment_date::text,
    0
  );

  perform pg_advisory_xact_lock(v_lock_key);

  if exists (
    select 1
    from public.appointments a
    where a.doctor_id = p_doctor_id
      and a.location_id = p_location_id
      and a.appointment_date = p_appointment_date
      and a.status in ('scheduled', 'rescheduled', 'checked_in')
      and p_start_time < a.end_time
      and p_end_time > a.start_time
  ) then
    raise exception 'This slot is no longer available.';
  end if;

  insert into public.appointments (
    clinic_id, location_id, doctor_id, service_id, patient_id,
    appointment_date, start_time, end_time,
    patient_first_name, patient_last_name,
    insurance_method, insurance_details, status, reason, notes,
    ai_triage_patient_note, ai_triage_summary, ai_triage_level, triage_session_id,
    created_by, updated_by
  ) values (
    p_clinic_id, p_location_id, p_doctor_id, p_service_id, p_patient_id,
    p_appointment_date, p_start_time, p_end_time,
    p_patient_first_name, p_patient_last_name,
    p_insurance_method::public.insurance_method, p_insurance_details, 'scheduled', p_reason, p_notes,
    p_ai_triage_patient_note, p_ai_triage_summary, p_ai_triage_level, p_triage_session_id,
    p_created_by, p_created_by
  )
  returning id into v_id;

  return v_id;
end;
$$;

-- =========================================================
-- 12. TRIGGERS
-- =========================================================

create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.handle_updated_at();
create trigger set_user_settings_updated_at before update on public.user_settings for each row execute function public.handle_updated_at();
create trigger set_clinic_details_updated_at before update on public.clinic_details for each row execute function public.handle_updated_at();
create trigger set_appointments_updated_at before update on public.appointments for each row execute function public.handle_updated_at();
create trigger set_appointment_notifications_updated_at before update on public.appointment_notifications for each row execute function public.handle_updated_at();
create trigger set_chat_conversations_updated_at before update on public.chat_conversations for each row execute function public.handle_updated_at();
create trigger set_patient_medical_records_updated_at before update on public.patient_medical_records for each row execute function public.handle_updated_at();
create trigger set_patient_files_updated_at before update on public.patient_files for each row execute function public.handle_updated_at();
create trigger set_patient_onboarding_reviews_updated_at before update on public.patient_onboarding_reviews for each row execute function public.handle_updated_at();

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();
create trigger on_new_chat_message after insert on public.chat_messages for each row execute function public.handle_new_chat_message();

do $$
begin
  begin alter publication supabase_realtime add table public.chat_conversations; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.chat_messages; exception when duplicate_object then null; when undefined_object then null; end;
  begin alter publication supabase_realtime add table public.chat_typing; exception when duplicate_object then null; when undefined_object then null; end;
end;
$$;

-- =========================================================
-- 13. ROW LEVEL SECURITY
-- =========================================================

alter table public.clinics enable row level security;
alter table public.profiles enable row level security;
alter table public.user_settings enable row level security;
alter table public.clinic_memberships enable row level security;
alter table public.platform_reviews enable row level security;
alter table public.clinic_details enable row level security;
alter table public.clinic_locations enable row level security;
alter table public.doctors enable row level security;
alter table public.doctor_locations enable row level security;
alter table public.clinic_services enable row level security;
alter table public.doctor_services enable row level security;
alter table public.doctor_availability enable row level security;
alter table public.clinic_technologies enable row level security;
alter table public.clinic_health_tips enable row level security;
alter table public.patient_health_tip_feedback enable row level security;
alter table public.ai_triage_sessions enable row level security;
alter table public.ai_audit_logs enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_status_logs enable row level security;
alter table public.appointment_notifications enable row level security;
alter table public.chat_conversations enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_typing enable row level security;
alter table public.patient_medical_records enable row level security;
alter table public.patient_files enable row level security;
alter table public.patient_onboarding_reviews enable row level security;

-- =========================================================
-- 14. RLS POLICIES
-- =========================================================

-- Public clinic content
create policy "Anyone can view active clinics" on public.clinics for select to public using (is_active = true);
create policy "Platform admins can manage clinics" on public.clinics for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "Anyone can read clinic details" on public.clinic_details for select to public using (true);
create policy "Clinic admins can manage clinic details" on public.clinic_details for all to authenticated using (public.is_clinic_admin(clinic_id)) with check (public.is_clinic_admin(clinic_id));

create policy "Anyone can read active clinic locations" on public.clinic_locations for select to public using (is_active = true);
create policy "Clinic admins can manage clinic locations" on public.clinic_locations for all to authenticated using (public.is_clinic_admin(clinic_id)) with check (public.is_clinic_admin(clinic_id));

create policy "Anyone can read active doctors" on public.doctors for select to public using (is_active = true);
create policy "Clinic admins can manage doctors" on public.doctors for all to authenticated using (public.is_clinic_admin(clinic_id)) with check (public.is_clinic_admin(clinic_id));
create policy "Doctors can update own doctor profile" on public.doctors for update to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy "Anyone can read doctor locations" on public.doctor_locations for select to public using (true);
create policy "Clinic admins can manage doctor locations" on public.doctor_locations for all to authenticated
using (exists (select 1 from public.doctors d where d.id = doctor_locations.doctor_id and public.is_clinic_admin(d.clinic_id)))
with check (exists (select 1 from public.doctors d where d.id = doctor_locations.doctor_id and public.is_clinic_admin(d.clinic_id)));

create policy "Anyone can read active clinic services" on public.clinic_services for select to public using (is_active = true);
create policy "Clinic admins can manage clinic services" on public.clinic_services for all to authenticated using (public.is_clinic_admin(clinic_id)) with check (public.is_clinic_admin(clinic_id));

create policy "Anyone can read doctor services" on public.doctor_services for select to public using (true);
create policy "Clinic admins can manage doctor services" on public.doctor_services for all to authenticated using (public.is_clinic_admin(clinic_id)) with check (public.is_clinic_admin(clinic_id));

create policy "Anyone can read active doctor availability" on public.doctor_availability for select to public using (is_active = true);
create policy "Clinic admins can manage doctor availability" on public.doctor_availability for all to authenticated
using (exists (select 1 from public.doctors d where d.id = doctor_availability.doctor_id and public.is_clinic_admin(d.clinic_id)))
with check (exists (select 1 from public.doctors d where d.id = doctor_availability.doctor_id and public.is_clinic_admin(d.clinic_id)));

create policy "Anyone can read active clinic technologies" on public.clinic_technologies for select to public using (is_active = true);
create policy "Clinic admins can manage clinic technologies" on public.clinic_technologies for all to authenticated using (public.is_clinic_admin(clinic_id)) with check (public.is_clinic_admin(clinic_id));

-- Profiles and settings
create policy "Users can view own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "Users can insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "Users can update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "Platform admins can view all profiles" on public.profiles for select to authenticated using (public.is_platform_admin());
create policy "Platform admins can update all profiles" on public.profiles for update to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());
create policy "Clinic admins can view clinic profiles" on public.profiles for select to authenticated
using (exists (
  select 1 from public.clinic_memberships cm_admin
  join public.clinic_memberships cm_target on cm_target.clinic_id = cm_admin.clinic_id
  where cm_admin.profile_id = auth.uid()
    and cm_admin.role = 'clinic_admin'
    and cm_admin.is_active = true
    and cm_target.profile_id = profiles.id
    and cm_target.is_active = true
));
create policy "Doctors can view assigned patients" on public.profiles for select to authenticated
using (exists (
  select 1 from public.appointments a
  join public.doctors d on d.id = a.doctor_id
  where a.patient_id = profiles.id
    and d.profile_id = auth.uid()
));

create policy "Users can manage own settings" on public.user_settings for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "Platform admins can view settings" on public.user_settings for select to authenticated using (public.is_platform_admin());

-- Memberships
create policy "Users can view own memberships" on public.clinic_memberships for select to authenticated using (profile_id = auth.uid());
create policy "Clinic admins can view clinic memberships" on public.clinic_memberships for select to authenticated using (public.is_clinic_admin(clinic_id));
create policy "Clinic admins can manage clinic memberships" on public.clinic_memberships for all to authenticated using (public.is_clinic_admin(clinic_id)) with check (public.is_clinic_admin(clinic_id));
create policy "Patients can insert own patient membership" on public.clinic_memberships for insert to authenticated with check (profile_id = auth.uid() and role = 'patient');

-- Reviews and health tips
create policy "Anyone can view visible platform reviews" on public.platform_reviews for select to public using (is_visible = true);
create policy "Authenticated users can insert platform reviews" on public.platform_reviews for insert to authenticated with check (true);
create policy "Platform admins can manage platform reviews" on public.platform_reviews for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "Authenticated users can read active health tips" on public.clinic_health_tips for select to authenticated using (is_active = true);
create policy "Clinic admins can manage health tips" on public.clinic_health_tips for all to authenticated using (public.is_clinic_admin(clinic_id)) with check (public.is_clinic_admin(clinic_id));
create policy "Users can manage own health tip feedback" on public.patient_health_tip_feedback for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());
create policy "Clinic admins can view clinic health tip feedback" on public.patient_health_tip_feedback for select to authenticated
using (exists (select 1 from public.clinic_health_tips t where t.id = patient_health_tip_feedback.tip_id and public.is_clinic_admin(t.clinic_id)));

-- Appointments, logs, notifications
create policy "Patients can view own appointments" on public.appointments for select to authenticated using (patient_id = auth.uid());
create policy "Patients can create own appointments" on public.appointments for insert to authenticated with check (patient_id = auth.uid() and created_by = auth.uid());
create policy "Patients can update own scheduled appointments" on public.appointments for update to authenticated using (patient_id = auth.uid() and status in ('scheduled', 'rescheduled')) with check (patient_id = auth.uid());
create policy "Doctors can view their appointments" on public.appointments for select to authenticated using (exists (select 1 from public.doctors d where d.id = appointments.doctor_id and d.profile_id = auth.uid()));
create policy "Doctors can update their appointments" on public.appointments for update to authenticated using (exists (select 1 from public.doctors d where d.id = appointments.doctor_id and d.profile_id = auth.uid())) with check (exists (select 1 from public.doctors d where d.id = appointments.doctor_id and d.profile_id = auth.uid()));
create policy "Clinic admins can manage clinic appointments" on public.appointments for all to authenticated using (public.is_clinic_admin(clinic_id)) with check (public.is_clinic_admin(clinic_id));
create policy "Platform admins can manage all appointments" on public.appointments for all to authenticated using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "Users can view appointment logs related to them" on public.appointment_status_logs for select to authenticated using (exists (select 1 from public.appointments a left join public.doctors d on d.id = a.doctor_id where a.id = appointment_status_logs.appointment_id and (a.patient_id = auth.uid() or d.profile_id = auth.uid() or public.is_clinic_admin(a.clinic_id) or public.is_platform_admin())));
create policy "Authenticated users can insert appointment logs" on public.appointment_status_logs for insert to authenticated with check (changed_by = auth.uid() or public.is_platform_admin());

create policy "Users can read own appointment notifications" on public.appointment_notifications for select to authenticated using (recipient_id = auth.uid() or public.is_platform_admin());
create policy "Users can update own appointment notifications" on public.appointment_notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());
create policy "Clinic staff can create appointment notifications" on public.appointment_notifications for insert to authenticated
with check (exists (select 1 from public.appointments a where a.id = appointment_notifications.appointment_id and (public.is_clinic_admin(a.clinic_id) or public.is_doctor_in_clinic(a.clinic_id) or public.is_platform_admin())));

-- Chat
create policy "Chat conversations participants can select" on public.chat_conversations for select to authenticated using (patient_id = auth.uid() or exists (select 1 from public.doctors d where d.id = chat_conversations.doctor_id and d.profile_id = auth.uid()) or public.is_clinic_admin(clinic_id) or public.is_platform_admin());
create policy "Participants can create conversations" on public.chat_conversations for insert to authenticated with check (patient_id = auth.uid() or public.is_clinic_admin(clinic_id) or public.is_platform_admin());
create policy "Participants can update conversations" on public.chat_conversations for update to authenticated using (patient_id = auth.uid() or exists (select 1 from public.doctors d where d.id = chat_conversations.doctor_id and d.profile_id = auth.uid()) or public.is_clinic_admin(clinic_id) or public.is_platform_admin()) with check (patient_id = auth.uid() or exists (select 1 from public.doctors d where d.id = chat_conversations.doctor_id and d.profile_id = auth.uid()) or public.is_clinic_admin(clinic_id) or public.is_platform_admin());

create policy "Chat messages participants can select" on public.chat_messages for select to authenticated using (exists (select 1 from public.chat_conversations c where c.id = chat_messages.conversation_id and (c.patient_id = auth.uid() or exists (select 1 from public.doctors d where d.id = c.doctor_id and d.profile_id = auth.uid()) or public.is_clinic_admin(c.clinic_id) or public.is_platform_admin())));
create policy "Chat messages participants can insert" on public.chat_messages for insert to authenticated with check (sender_profile_id = auth.uid() and exists (select 1 from public.chat_conversations c where c.id = chat_messages.conversation_id and (c.patient_id = auth.uid() or exists (select 1 from public.doctors d where d.id = c.doctor_id and d.profile_id = auth.uid()))));

create policy "Typing participants can manage" on public.chat_typing for all to authenticated using (profile_id = auth.uid()) with check (profile_id = auth.uid());

-- AI triage and audit
create policy "Users can manage own triage sessions" on public.ai_triage_sessions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "Clinic staff can read clinic triage sessions" on public.ai_triage_sessions for select to authenticated using (public.is_clinic_admin(clinic_id) or public.is_doctor_in_clinic(clinic_id));
create policy "Users can read own audit logs" on public.ai_audit_logs for select to authenticated using (user_id = auth.uid());
create policy "Platform admins can read audit logs" on public.ai_audit_logs for select to authenticated using (public.is_platform_admin());

-- Patient medical data
create policy "Patients can read own medical records" on public.patient_medical_records for select to authenticated using (patient_id = auth.uid());
create policy "Doctors and clinic admins can read medical records" on public.patient_medical_records for select to authenticated using (public.can_access_patient(patient_id, clinic_id));
create policy "Doctors and clinic admins can insert medical records" on public.patient_medical_records for insert to authenticated with check (public.is_clinic_admin(clinic_id) or exists (select 1 from public.doctors d where d.id = patient_medical_records.doctor_id and d.profile_id = auth.uid()) or public.is_platform_admin());
create policy "Doctors and clinic admins can update medical records" on public.patient_medical_records for update to authenticated using (public.can_access_patient(patient_id, clinic_id)) with check (public.can_access_patient(patient_id, clinic_id));

create policy "Patients can read own files" on public.patient_files for select to authenticated using (patient_id = auth.uid());
create policy "Patients can upload own files" on public.patient_files for insert to authenticated with check (patient_id = auth.uid() and uploaded_by = auth.uid());
create policy "Doctors and clinic admins can read patient files" on public.patient_files for select to authenticated using (public.can_access_patient(patient_id, clinic_id));
create policy "Doctors and clinic admins can insert patient files" on public.patient_files for insert to authenticated with check (public.is_clinic_admin(clinic_id) or exists (select 1 from public.doctors d where d.id = patient_files.doctor_id and d.profile_id = auth.uid()) or public.is_platform_admin());
create policy "Doctors and clinic admins can update patient files" on public.patient_files for update to authenticated using (public.can_access_patient(patient_id, clinic_id)) with check (public.can_access_patient(patient_id, clinic_id));

create policy "Patients can read own onboarding reviews" on public.patient_onboarding_reviews for select to authenticated using (patient_id = auth.uid());
create policy "Clinic staff can manage onboarding reviews" on public.patient_onboarding_reviews for all to authenticated using (public.is_clinic_admin(clinic_id) or public.is_doctor_in_clinic(clinic_id) or public.is_platform_admin()) with check (public.is_clinic_admin(clinic_id) or public.is_doctor_in_clinic(clinic_id) or public.is_platform_admin());

-- =========================================================
-- 15. STORAGE BUCKETS
-- =========================================================

insert into storage.buckets (id, name, public)
values
  ('avatars', 'avatars', true),
  ('clinic-content', 'clinic-content', true),
  ('patient-files', 'patient-files', true)
on conflict (id) do update
set public = excluded.public;

drop policy if exists "Users can read avatars" on storage.objects;
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

drop policy if exists "Admins can read clinic content images" on storage.objects;
drop policy if exists "Admins can upload clinic content images" on storage.objects;
drop policy if exists "Admins can update clinic content images" on storage.objects;
drop policy if exists "Admins can delete clinic content images" on storage.objects;

drop policy if exists "Allow authenticated reads from patient-files" on storage.objects;
drop policy if exists "Allow authenticated uploads to patient-files" on storage.objects;
drop policy if exists "Allow authenticated updates to patient-files" on storage.objects;
drop policy if exists "Allow authenticated deletes from patient-files" on storage.objects;

commit;