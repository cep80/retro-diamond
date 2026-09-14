-- Anonymous aggregate telemetry (90-day purge via cron; no day partitions in M4).
-- user_id FK deferred until migrations/auth is opted in.

create table if not exists telemetry_events (
  id bigserial primary key,
  device_id text not null,
  session_id text,
  user_id text,
  name text not null,
  props jsonb not null default '{}',
  version text,
  event_t timestamptz not null,
  received_at timestamptz not null default now()
);

create index if not exists telemetry_events_received_at_idx on telemetry_events (received_at);
create index if not exists telemetry_events_name_idx on telemetry_events (name, received_at);

create table if not exists telemetry_daily_agg (
  day date not null,
  name text not null,
  count bigint not null default 0,
  primary key (day, name)
);
