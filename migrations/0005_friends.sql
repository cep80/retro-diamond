-- Friend relationships and user reports.
-- user_id FK deferred until migrations/auth is opted in.

create table if not exists friendships (
  id text primary key,
  user_a text not null,
  user_b text not null,
  status text not null default 'pending',
  requester_id text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (user_a < user_b),
  unique (user_a, user_b)
);

create index if not exists friendships_user_a_idx on friendships (user_a, status);
create index if not exists friendships_user_b_idx on friendships (user_b, status);

create table if not exists reports (
  id text primary key,
  reporter_id text not null,
  target_id text not null,
  target_type text not null,
  reason text,
  created_at timestamptz not null default now()
);

create index if not exists reports_target_idx on reports (target_type, target_id);
