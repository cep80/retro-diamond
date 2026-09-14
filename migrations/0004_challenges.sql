-- Weekly challenges, verified submissions, leaderboard snapshots, honor boards.
-- user_id FK deferred until migrations/auth is opted in.

create table if not exists challenges (
  id text primary key,
  iso_week text not null unique,
  seed text not null,
  sim_version int not null,
  scenario text not null,
  rules jsonb not null default '{}',
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  status text not null default 'open',
  created_at timestamptz not null default now()
);

create table if not exists submissions (
  id text primary key,
  challenge_id text not null references challenges (id) on delete cascade,
  user_id text not null,
  score int not null default 0,
  pitches int not null default 0,
  status text not null default 'pending',
  assist boolean not null default false,
  log jsonb,
  result jsonb,
  server_score int,
  mismatch boolean not null default false,
  re_sim_ms int,
  submitted_at timestamptz not null default now(),
  unique (challenge_id, user_id)
);

create index if not exists submissions_verified_idx
  on submissions (challenge_id, score desc)
  where status = 'verified';

create table if not exists leaderboard_snapshots (
  id text primary key,
  challenge_id text not null references challenges (id) on delete cascade,
  rank int not null,
  user_id text not null,
  score int not null,
  pitches int not null default 0,
  snapshot_at timestamptz not null default now()
);

create index if not exists leaderboard_snapshots_challenge_idx
  on leaderboard_snapshots (challenge_id, rank);

create table if not exists honor_scores (
  id text primary key,
  user_id text not null,
  board_type text not null,
  season_year int,
  score int not null,
  metadata jsonb not null default '{}',
  submitted_at timestamptz not null default now()
);

create index if not exists honor_scores_board_idx on honor_scores (board_type, score desc);
