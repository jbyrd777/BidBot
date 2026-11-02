-- Bid Desk: multi tenant core schema
-- Every business table carries company_id and is protected by row level security,
-- so one flooring company can never read another company's bids.

create extension if not exists "pgcrypto";

-- Companies (tenants) ---------------------------------------------------------
create table companies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  logo_url    text,
  brand_color text,
  created_at  timestamptz not null default now()
);

-- Who belongs to which company, and what they are allowed to do.
-- Roles follow the flooring org chart: estimating gives quantities, sales owns price.
create type member_role as enum ('owner', 'admin', 'sales', 'estimator', 'project_manager', 'viewer');

create table members (
  company_id uuid not null references companies(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  role       member_role not null default 'viewer',
  created_at timestamptz not null default now(),
  primary key (company_id, user_id)
);

create or replace function is_member(target_company uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members m
    where m.company_id = target_company and m.user_id = auth.uid()
  );
$$;

create or replace function has_role(target_company uuid, allowed member_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from members m
    where m.company_id = target_company and m.user_id = auth.uid() and m.role = any(allowed)
  );
$$;

-- Company settings: the rules Bid Desk screens every invitation against.
create table company_settings (
  company_id        uuid primary key references companies(id) on delete cascade,
  service_states    text[] not null default '{}',
  min_lead_days     int not null default 3,
  require_flooring  boolean not null default true,
  preferred_gcs     text[] not null default '{}',
  blocked_gcs       text[] not null default '{}',
  divisions         text[] not null default '{}',
  updated_at        timestamptz not null default now()
);

-- Bots --------------------------------------------------------------------------
create type bot_kind as enum (
  'bid_desk', 'scope_analyst', 'takeoff_coordinator', 'vendor_rfq',
  'proposal_builder', 'gc_follow_up', 'submittals'
);
create type bot_status as enum ('off', 'review', 'live');

create table bots (
  id           uuid primary key default gen_random_uuid(),
  company_id   uuid not null references companies(id) on delete cascade,
  kind         bot_kind not null,
  name         text not null,
  status       bot_status not null default 'review',
  email        text,           -- inbox from the email provider
  phone        text,           -- number from the phone provider
  computer_id  text,           -- cloud computer id
  created_at   timestamptz not null default now(),
  unique (company_id, kind)
);

-- Inbound email the bots have read, kept so every parsed field can be traced back.
create table inbound_messages (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references companies(id) on delete cascade,
  provider      text not null,          -- gmail, outlook, bot_inbox
  provider_id   text not null,          -- message id at the provider
  subject       text,
  from_name     text,
  from_address  text,
  received_at   timestamptz,
  body_text     text,
  created_at    timestamptz not null default now(),
  unique (company_id, provider, provider_id)
);

-- Invitations to bid -------------------------------------------------------------
create type itb_platform as enum ('buildingconnected', 'constructconnect', 'procore', 'direct', 'client_batch');
create type itb_decision as enum ('pending', 'bid', 'no_bid');

create table itbs (
  id                uuid primary key default gen_random_uuid(),
  company_id        uuid not null references companies(id) on delete cascade,
  source_message_id uuid references inbound_messages(id) on delete set null,
  platform          itb_platform not null,
  external_ref      text,                 -- RFP id, job number
  project_name      text not null,
  package_name      text,
  gc_name           text,
  gc_contact_name   text,
  gc_contact_email  text,
  gc_contact_phone  text,
  requested_by      text,                 -- client who forwarded or sent the work
  location          text,
  state             text,
  due_date          date,
  due_time          time,
  due_tz            text,
  job_walk_date     date,
  rfi_due_date      date,
  start_date        date,
  project_sf        int,
  flooring_scope    text[] not null default '{}',
  links             jsonb not null default '[]',
  description       text,
  recommendation    text,                 -- bid, review, no_bid (screen result)
  recommendation_reasons text[] not null default '{}',
  decision          itb_decision not null default 'pending',
  decided_by        uuid references auth.users(id),
  decided_at        timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index itbs_company_due on itbs (company_id, due_date);

-- Everything that happens to a bid after the invitation: revised dates, RFIs, addenda.
create table itb_events (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id) on delete cascade,
  itb_id      uuid not null references itbs(id) on delete cascade,
  kind        text not null,              -- invite, update, reminder, decision
  summary     text not null,
  message_id  uuid references inbound_messages(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- Row level security ------------------------------------------------------------
alter table companies         enable row level security;
alter table members           enable row level security;
alter table company_settings  enable row level security;
alter table bots              enable row level security;
alter table inbound_messages  enable row level security;
alter table itbs              enable row level security;
alter table itb_events        enable row level security;

create policy "members read their company" on companies
  for select using (is_member(id));
create policy "members read members" on members
  for select using (is_member(company_id));
create policy "admins manage members" on members
  for all using (has_role(company_id, array['owner','admin']::member_role[]));

create policy "members read settings" on company_settings
  for select using (is_member(company_id));
create policy "admins edit settings" on company_settings
  for all using (has_role(company_id, array['owner','admin']::member_role[]));

create policy "members read bots" on bots
  for select using (is_member(company_id));
create policy "admins manage bots" on bots
  for all using (has_role(company_id, array['owner','admin']::member_role[]));

create policy "members read messages" on inbound_messages
  for select using (is_member(company_id));

create policy "members read itbs" on itbs
  for select using (is_member(company_id));
-- Bid or no bid is a sales and estimating call, never a viewer's.
create policy "deciders update itbs" on itbs
  for update using (has_role(company_id, array['owner','admin','sales','estimator']::member_role[]));

create policy "members read events" on itb_events
  for select using (is_member(company_id));

-- Inserts into inbound_messages, itbs and itb_events come from the server
-- with the service role key, which bypasses row level security.
