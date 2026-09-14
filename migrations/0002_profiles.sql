-- User profiles for display names, friend codes, and moderation flags.
-- user_id is Better Auth's user id; FK deferred until migrations/auth is opted in.

create table if not exists profiles (
  user_id text primary key,
  display_name text,
  friend_code text unique,
  is_anonymous boolean not null default true,
  flagged boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_display_name_ci
  on profiles (lower(display_name))
  where display_name is not null;

create index if not exists profiles_friend_code_idx on profiles (friend_code);
