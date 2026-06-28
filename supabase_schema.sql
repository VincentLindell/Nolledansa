-- ============================================================
-- NolleDansa – Supabase SQL Schema
-- Kör detta i Supabase > SQL Editor
-- ============================================================

-- Enable UUID extension (usually already enabled)
create extension if not exists "pgcrypto";

-- ============================================================
-- Table: dances
-- ============================================================
create table if not exists public.dances (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  title         text not null,
  section       text not null,       -- "D", "E", "F", ...
  organization  text not null default 'Nollningen'
    check (organization in ('Nollningen', 'Sexmästeriet', 'Festmästeriet', 'Phusk')),
  year          text not null,       -- "23", "24", ...
  song_title    text not null,
  dancer_names  text not null default '',
  artist        text,
  spotify_url   text,
  video_url     text not null,
  thumbnail_url text,
  created_by    uuid references auth.users(id) on delete set null
);

-- ============================================================
-- Table: dance_segments
-- ============================================================
create table if not exists public.dance_segments (
  id          uuid primary key default gen_random_uuid(),
  dance_id    uuid not null references public.dances(id) on delete cascade,
  name        text not null,
  description text,
  start_time  numeric not null,   -- seconds, e.g. 42.5
  end_time    numeric not null,
  sort_order  integer not null default 0
);

-- ============================================================
-- Table: dance_clicks  (for trending)
-- ============================================================
create table if not exists public.dance_clicks (
  id         uuid primary key default gen_random_uuid(),
  dance_id   uuid not null references public.dances(id) on delete cascade,
  created_at timestamptz not null default now(),
  user_id    uuid references auth.users(id) on delete set null,
  session_id text
);

-- ============================================================
-- Table: dance_edit_requests
-- ============================================================
create table if not exists public.dance_edit_requests (
  id             uuid primary key default gen_random_uuid(),
  created_at     timestamptz not null default now(),
  dance_id       uuid not null references public.dances(id) on delete cascade,
  title          text not null,
  section        text not null,
  year           text not null,
  song_title     text not null,
  dancer_names   text not null default '',
  artist         text,
  spotify_url    text,
  thumbnail_url  text,
  requester_note text,
  status         text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  resolved_at    timestamptz
);

-- ============================================================
-- Table: dance_edit_request_segments
-- ============================================================
create table if not exists public.dance_edit_request_segments (
  id          uuid primary key default gen_random_uuid(),
  request_id  uuid not null references public.dance_edit_requests(id) on delete cascade,
  name        text not null,
  description text,
  start_time  numeric not null,
  end_time    numeric not null,
  sort_order  integer not null default 0
);

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_dance_segments_dance_id
  on public.dance_segments(dance_id);

create index if not exists idx_dance_clicks_dance_id
  on public.dance_clicks(dance_id);

create index if not exists idx_dance_clicks_created_at
  on public.dance_clicks(created_at);

create index if not exists idx_dance_edit_requests_dance_id
  on public.dance_edit_requests(dance_id);

create index if not exists idx_dance_edit_request_segments_request_id
  on public.dance_edit_request_segments(request_id);

-- ============================================================
-- Row Level Security
-- ============================================================

-- dances: everyone can read, authenticated users can insert
alter table public.dances enable row level security;

create policy "Anyone can view dances"
  on public.dances for select
  using (true);

create policy "Authenticated users can insert dances"
  on public.dances for insert
  with check (auth.uid() is not null);

create policy "Owner can update their dance"
  on public.dances for update
  using (auth.uid() = created_by);

create policy "Owner can delete their dance"
  on public.dances for delete
  using (auth.uid() = created_by);

-- dance_segments: follow dances permissions
alter table public.dance_segments enable row level security;

create policy "Anyone can view segments"
  on public.dance_segments for select
  using (true);

create policy "Owner can insert segments"
  on public.dance_segments for insert
  with check (
    auth.uid() = (
      select created_by from public.dances where id = dance_id
    )
  );

create policy "Owner can update segments"
  on public.dance_segments for update
  using (
    auth.uid() = (
      select created_by from public.dances where id = dance_id
    )
  );

create policy "Owner can delete segments"
  on public.dance_segments for delete
  using (
    auth.uid() = (
      select created_by from public.dances where id = dance_id
    )
  );

-- dance_clicks: anyone can insert (for tracking), anyone can read
alter table public.dance_clicks enable row level security;

create policy "Anyone can insert click"
  on public.dance_clicks for insert
  with check (true);

create policy "Anyone can view clicks"
  on public.dance_clicks for select
  using (true);

-- dance_edit_requests: anyone can submit change requests
alter table public.dance_edit_requests enable row level security;

create policy "Anyone can insert edit requests"
  on public.dance_edit_requests for insert
  with check (status = 'pending');

-- dance_edit_request_segments: anyone can insert rows for their request
alter table public.dance_edit_request_segments enable row level security;

create policy "Anyone can insert edit request segments"
  on public.dance_edit_request_segments for insert
  with check (true);

-- ============================================================
-- Storage Bucket: dance-videos
-- ============================================================
-- Run in Supabase > Storage to create the bucket, OR use the
-- dashboard UI: Storage > New Bucket > name: "dance-videos", Public: true
--
-- If using SQL:
insert into storage.buckets (id, name, public)
values ('dance-videos', 'dance-videos', true)
on conflict (id) do nothing;

-- Storage policies for dance-videos bucket
create policy "Public read access for dance-videos"
  on storage.objects for select
  using (bucket_id = 'dance-videos');

create policy "Authenticated users can upload videos"
  on storage.objects for insert
  with check (
    bucket_id = 'dance-videos'
    and auth.uid() is not null
  );

create policy "Owner can delete their video"
  on storage.objects for delete
  using (
    bucket_id = 'dance-videos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
