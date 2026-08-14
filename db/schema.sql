create extension if not exists pgcrypto;

create table if not exists dances (
  id uuid primary key,
  created_at timestamptz not null default now(),
  title text not null,
  section text not null,
  organization text,
  year text not null,
  song_title text not null,
  dancer_names text,
  artist text,
  spotify_url text,
  video_url text not null,
  thumbnail_url text,
  created_by text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'hidden')),
  hidden_until timestamptz,
  hidden_note text,
  hidden_at timestamptz
);

create table if not exists dance_segments (
  id uuid primary key default gen_random_uuid(),
  dance_id uuid not null references dances(id) on delete cascade,
  name text not null,
  description text,
  start_time double precision not null,
  end_time double precision not null,
  sort_order integer not null default 0
);

create index if not exists idx_dance_segments_dance_id_sort
  on dance_segments(dance_id, sort_order);

create table if not exists dance_clicks (
  id uuid primary key default gen_random_uuid(),
  dance_id uuid not null references dances(id) on delete cascade,
  created_at timestamptz not null default now(),
  user_id text,
  session_id text
);

create index if not exists idx_dance_clicks_dance_created
  on dance_clicks(dance_id, created_at desc);
create index if not exists idx_dance_clicks_session_created
  on dance_clicks(session_id, created_at desc);

create table if not exists dance_edit_requests (
  id uuid primary key,
  created_at timestamptz not null default now(),
  dance_id uuid not null references dances(id) on delete cascade,
  request_type text not null default 'edit' check (request_type in ('edit', 'delete', 'hide')),
  title text not null,
  section text not null,
  organization text,
  year text not null,
  song_title text not null,
  dancer_names text,
  artist text,
  spotify_url text,
  video_url text,
  thumbnail_url text,
  requester_note text,
  hide_until timestamptz,
  hide_indefinitely boolean,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  resolved_at timestamptz
);

create index if not exists idx_dance_edit_requests_dance_status_created
  on dance_edit_requests(dance_id, status, created_at desc);

create table if not exists dance_edit_request_segments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references dance_edit_requests(id) on delete cascade,
  name text not null,
  description text,
  start_time double precision not null,
  end_time double precision not null,
  sort_order integer not null default 0
);

create index if not exists idx_edit_request_segments_request_sort
  on dance_edit_request_segments(request_id, sort_order);

create table if not exists section_chants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  section text not null,
  name text not null,
  melody text not null,
  lyrics text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected'))
);

create index if not exists idx_section_chants_status_section_name
  on section_chants(status, section, name);
