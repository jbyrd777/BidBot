-- BidBot core schema.
-- One workspace per customer company. Every business table carries workspace_id and is protected by
-- row level security, so one company can never read or change another company's data, whatever the app does.

create schema if not exists extensions;
create extension if not exists "pgcrypto" with schema extensions;

-- Workspaces and people -----------------------------------------------------------------

create table workspaces (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 1 and 120),
  trade           text not null default 'flooring',
  settings        jsonb not null default '{"serviceStates": [], "minLeadDays": 3, "requireTradeMention": true, "preferredGcs": [], "blockedGcs": []}',
  weekly_capacity int not null default 8 check (weekly_capacity between 1 and 500),
  plan            text not null default 'trial',
  created_by      uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

-- Roles follow a subcontractor's office: estimating gives quantities, sales owns price, the owner decides.
create type member_role as enum ('owner', 'admin', 'sales', 'estimator', 'project_manager', 'viewer');

create table members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         member_role not null default 'viewer',
  display_name text not null default '',
  about        text not null default '',
  created_at   timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
create index members_user on members (user_id);

create table invites (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email        text not null,
  role         member_role not null default 'viewer',
  token        text not null unique default encode(extensions.gen_random_bytes(24), 'hex'),
  invited_by   uuid references auth.users(id) on delete set null,
  accepted_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (workspace_id, email)
);

create or replace function is_member(ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m where m.workspace_id = ws and m.user_id = auth.uid());
$$;

create or replace function has_role(ws uuid, allowed member_role[])
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from members m where m.workspace_id = ws and m.user_id = auth.uid() and m.role = any(allowed));
$$;

-- The bot team ------------------------------------------------------------------------

create table bots (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  id           text not null,                 -- chief, bid_desk, scope_analyst, ...
  name         text not null,
  role         text not null default '',
  status       text not null default 'live' check (status in ('live', 'review', 'off')),
  autonomy     text not null default 'ask' check (autonomy in ('ask', 'auto')),
  access       text[] not null default '{}',  -- connected app keys this bot may use
  sort         int not null default 0,
  primary key (workspace_id, id)
);

-- One thread per bot per workspace; each row is one message in it.
create table messages (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  thread_bot   text not null,
  sender       text not null,                 -- 'user' or a bot id
  author       uuid references auth.users(id) on delete set null,
  text         text not null default '',
  blocks       jsonb not null default '[]',
  created_at   timestamptz not null default now()
);
create index messages_thread on messages (workspace_id, thread_bot, created_at);

create table approvals (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  bot_id       text not null,
  thread_bot   text not null,
  kind         text not null check (kind in ('decide', 'create_task', 'send_email')),
  summary      text not null,
  payload      jsonb not null default '{}',
  status       text not null default 'waiting' check (status in ('waiting', 'done', 'declined')),
  result       text,
  decided_by   uuid references auth.users(id) on delete set null,
  decided_at   timestamptz,
  created_at   timestamptz not null default now()
);
create index approvals_waiting on approvals (workspace_id, status, created_at);

create table tasks (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  title        text not null,
  owner        text not null default '',
  bid_id       text,
  due          date,
  status       text not null default 'open' check (status in ('open', 'done')),
  created_at   timestamptz not null default now()
);

create table facts (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  text         text not null check (char_length(text) between 1 and 500),
  bot_id       text not null default 'chief',
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- Invitations to bid ------------------------------------------------------------------

-- Raw mail the bots read, kept so every parsed field can be traced back to its source.
create table inbound_messages (
  id            uuid primary key default gen_random_uuid(),
  workspace_id  uuid not null references workspaces(id) on delete cascade,
  provider      text not null,
  provider_id   text not null,
  subject       text,
  from_name     text,
  from_address  text,
  received_at   timestamptz,
  body_text     text,
  body_html     text,
  created_at    timestamptz not null default now(),
  unique (workspace_id, provider, provider_id)
);

-- A bid: the parsed invitation and its screen result live in `data`; the columns are what we filter on.
create type bid_decision as enum ('pending', 'bid', 'no_bid');

create table bids (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  id           text not null,
  data         jsonb not null,
  due_date     date,
  decision     bid_decision not null default 'pending',
  decided_by   uuid references auth.users(id) on delete set null,
  decided_at   timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  primary key (workspace_id, id)
);
create index bids_due on bids (workspace_id, due_date);

-- Usage, for billing ---------------------------------------------------------------------

-- One row per metered action (a model call, a lookup, a text). Written by the server only.
create table usage_events (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  kind         text not null,
  units        numeric not null default 0,
  cost_cents   numeric not null default 0,
  created_at   timestamptz not null default now()
);
create index usage_month on usage_events (workspace_id, created_at);

-- Row level security ---------------------------------------------------------------------

alter table workspaces      enable row level security;
alter table members         enable row level security;
alter table invites         enable row level security;
alter table bots            enable row level security;
alter table messages        enable row level security;
alter table approvals       enable row level security;
alter table tasks           enable row level security;
alter table facts           enable row level security;
alter table inbound_messages enable row level security;
alter table bids            enable row level security;
alter table usage_events    enable row level security;

-- Workspaces: members read; owners and admins change settings. Creation goes through create_workspace().
create policy ws_read on workspaces for select using (is_member(id));
create policy ws_update on workspaces for update using (has_role(id, array['owner','admin']::member_role[]));

-- Members: everyone in the workspace sees the team; owners and admins manage it; a person may edit their own profile.
create policy mem_read on members for select using (is_member(workspace_id));
create policy mem_manage on members for all using (has_role(workspace_id, array['owner','admin']::member_role[]))
  with check (has_role(workspace_id, array['owner','admin']::member_role[]));
create policy mem_self on members for update using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy inv_manage on invites for all using (has_role(workspace_id, array['owner','admin']::member_role[]))
  with check (has_role(workspace_id, array['owner','admin']::member_role[]));

-- The team, chats and memory: any member reads and writes; owners and admins change how bots work.
create policy bots_read on bots for select using (is_member(workspace_id));
create policy bots_manage on bots for update using (has_role(workspace_id, array['owner','admin']::member_role[]));

create policy msg_all on messages for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy tasks_all on tasks for all using (is_member(workspace_id)) with check (is_member(workspace_id));
create policy facts_all on facts for all using (is_member(workspace_id)) with check (is_member(workspace_id));

-- Approvals: members see them and bots create them; viewers cannot say yes.
create policy appr_read on approvals for select using (is_member(workspace_id));
create policy appr_insert on approvals for insert with check (is_member(workspace_id));
create policy appr_decide on approvals for update using (has_role(workspace_id, array['owner','admin','sales','estimator','project_manager']::member_role[]));

-- Bids: members read; the people who make calls can change them.
create policy bids_read on bids for select using (is_member(workspace_id));
create policy bids_write on bids for insert with check (is_member(workspace_id));
create policy bids_decide on bids for update using (has_role(workspace_id, array['owner','admin','sales','estimator']::member_role[]));

create policy inbound_read on inbound_messages for select using (is_member(workspace_id));
create policy inbound_write on inbound_messages for insert with check (is_member(workspace_id));

-- Usage is visible to owners and admins; nobody writes it through the API.
create policy usage_read on usage_events for select using (has_role(workspace_id, array['owner','admin']::member_role[]));

-- Functions the app calls ------------------------------------------------------------------

-- Make a workspace, make the caller its owner, and seed the default bot team.
create or replace function create_workspace(ws_name text, ws_trade text, your_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  insert into workspaces (name, trade, created_by) values (ws_name, ws_trade, auth.uid()) returning id into ws;
  insert into members (workspace_id, user_id, role, display_name) values (ws, auth.uid(), 'owner', coalesce(your_name, ''));
  insert into bots (workspace_id, id, name, role, sort) values
    (ws, 'chief', 'Foreman', 'Runs the team. Takes any request, hands it to the right bot and reports back', 0),
    (ws, 'bid_desk', 'Bid Desk', 'Reads every invitation, pulls out the dates and scope, and screens it against your rules', 1),
    (ws, 'scope_analyst', 'Scope Analyst', 'Writes the go or no go snapshot and the full scope report from the plans and specs', 2),
    (ws, 'takeoff_coordinator', 'Takeoff Coordinator', 'Routes plans to estimators, tracks progress and returns quantities to sales', 3),
    (ws, 'vendor_rfq', 'Vendor RFQ', 'Drafts RFQs from the takeoff, sends them from your email and logs the pricing that comes back', 4),
    (ws, 'proposal_builder', 'Proposal Builder', 'Assembles the proposal with inclusions, exclusions and alternates once sales sets the price', 5),
    (ws, 'gc_follow_up', 'GC Follow Up', 'Confirms receipt, chases bid results and keeps GC contacts current', 6),
    (ws, 'submittals', 'Submittals', 'Pulls data sheets and warranties and assembles submittal packages after award', 7);
  return ws;
end;
$$;

-- Join a workspace from an invite. The signed in email must match the invited email.
create or replace function accept_invite(invite_token text, your_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare inv invites%rowtype;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  select * into inv from invites where token = invite_token and accepted_at is null;
  if not found then raise exception 'invite not found or already used'; end if;
  if lower(inv.email) <> lower(coalesce(auth.jwt() ->> 'email', '')) then raise exception 'this invite is for a different email'; end if;
  insert into members (workspace_id, user_id, role, display_name) values (inv.workspace_id, auth.uid(), inv.role, coalesce(your_name, ''))
    on conflict (workspace_id, user_id) do update set role = excluded.role;
  update invites set accepted_at = now() where id = inv.id;
  return inv.workspace_id;
end;
$$;

-- Lock the helper functions to signed in users only.
revoke execute on function create_workspace(text, text, text) from public, anon;
revoke execute on function accept_invite(text, text) from public, anon;
grant execute on function create_workspace(text, text, text) to authenticated;
grant execute on function accept_invite(text, text) to authenticated;
