-- Cloud save slots (CAS on rev) and conflict backups.
-- user_id FK deferred until migrations/auth is opted in.

create table if not exists saves (
  user_id text not null,
  slot smallint not null check (slot >= 0 and slot <= 2),
  rev bigint not null default 0,
  save_version int not null,
  hash text not null,
  blob bytea not null,
  summary jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  primary key (user_id, slot),
  constraint saves_blob_size check (octet_length(blob) <= 524288)
);

create index if not exists saves_user_updated_idx on saves (user_id, updated_at desc);

create table if not exists saves_backup (
  id text primary key,
  user_id text not null,
  slot smallint not null check (slot >= 0 and slot <= 2),
  rev bigint not null,
  save_version int not null,
  hash text not null,
  blob bytea not null,
  summary jsonb not null default '{}',
  backed_up_at timestamptz not null default now()
);

create index if not exists saves_backup_user_slot_idx on saves_backup (user_id, slot, backed_up_at desc);
