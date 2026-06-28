-- ============================================================
-- Sektionsramsor
-- Run this in Supabase SQL Editor.
-- ============================================================

create table if not exists public.section_chants (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  section    text not null
    constraint section_chants_section_check
    check (section in ('A', 'D', 'E', 'F', 'I', 'ING', 'K', 'M', 'V', 'W')),
  name       text,
  melody     text not null check (char_length(trim(melody)) > 0),
  lyrics     text not null check (char_length(trim(lyrics)) > 0),
  status     text not null default 'pending'
    constraint section_chants_status_check
    check (status in ('pending', 'approved', 'rejected'))
);

alter table public.section_chants
  add column if not exists name text;

update public.section_chants
set name = melody
where name is null or char_length(trim(name)) = 0;

alter table public.section_chants
  alter column name set not null;

alter table public.section_chants
  drop constraint if exists section_chants_name_check;

alter table public.section_chants
  add constraint section_chants_name_check
  check (char_length(trim(name)) > 0);

alter table public.section_chants
  add column if not exists status text;

update public.section_chants
set status = 'approved'
where status is null;

alter table public.section_chants
  alter column status set default 'pending';

alter table public.section_chants
  alter column status set not null;

alter table public.section_chants
  drop constraint if exists section_chants_status_check;

alter table public.section_chants
  add constraint section_chants_status_check
  check (status in ('pending', 'approved', 'rejected'));

delete from public.section_chants
where section in ('BME', 'N');

alter table public.section_chants
  drop constraint if exists section_chants_section_check;

alter table public.section_chants
  add constraint section_chants_section_check
  check (section in ('A', 'D', 'E', 'F', 'I', 'ING', 'K', 'M', 'V', 'W'));

create index if not exists idx_section_chants_section
  on public.section_chants(section);

create index if not exists idx_section_chants_created_at
  on public.section_chants(created_at desc);

create index if not exists idx_section_chants_status
  on public.section_chants(status);

alter table public.section_chants enable row level security;

drop policy if exists "Anyone can view section chants"
  on public.section_chants;

create policy "Anyone can view section chants"
  on public.section_chants for select
  using (status = 'approved');

drop policy if exists "Anyone can insert section chants"
  on public.section_chants;

create policy "Anyone can insert section chants"
  on public.section_chants for insert
  with check (status = 'pending');
