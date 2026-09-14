-- Shared replay scorecards and blob references.
-- user_id FK deferred until migrations/auth is opted in.

create table if not exists replays (
  id text primary key,
  user_id text not null,
  challenge_id text references challenges (id) on delete set null,
  title text,
  blob_url text,
  summary jsonb not null default '{}',
  is_public boolean not null default false,
  pinned boolean not null default false,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists replays_user_idx on replays (user_id, created_at desc);
create index if not exists replays_public_idx on replays (is_public, created_at desc) where is_public;
