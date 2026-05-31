create table if not exists investors (
    id serial primary key,
    address text unique not null,
    eligible boolean not null default false,
    vc_hash text
);


create table if not exists audit_log (
    id serial primary key,
    at timestamptz default now(),
    actor text,
    action text,
    payload jsonb
);

-- AML velocity ledger: one row per on-chain transaction, pruned by a rolling
-- 24h window. Survives server restarts unlike the in-memory fallback.
create table if not exists aml_transactions (
    id      serial primary key,
    address text not null,
    amount  numeric not null,       -- token units (18 decimals), stored as numeric
    ts      timestamptz not null default now()
);

create index if not exists aml_transactions_address_ts
    on aml_transactions (address, ts);

-- Sanctions blocklist: complements the static OFAC list in code.
-- Managed by compliance ops via POST /sanctions/block (admin only).
create table if not exists sanctions_blocklist (
    id      serial primary key,
    address text unique not null,
    reason  text not null,
    active  boolean not null default true,
    added_at timestamptz not null default now()
);