-- Bot computers. One cloud computer per workspace, and the jobs its bots run on it.
-- The computer's screen password is never stored: the app fetches it from the provider for each session.

create table computers (
  workspace_id uuid primary key references workspaces(id) on delete cascade,
  provider     text not null check (provider ~ '^[a-z_]{1,40}$'),
  provider_id  text not null check (char_length(provider_id) between 1 and 200),
  status       text not null default 'stopped' check (status in ('stopped', 'running')),
  held         boolean not null default false,
  updated_at   timestamptz not null default now()
);

create table computer_jobs (
  id           uuid primary key,
  workspace_id uuid not null references workspaces(id) on delete cascade,
  bot_id       text not null,
  thread_bot   text not null,
  title        text not null check (char_length(title) between 1 and 200),
  task         text not null check (char_length(task) between 1 and 8000),
  ref          text,
  status       text not null default 'queued' check (status in ('queued', 'running', 'needs_you', 'done', 'failed')),
  result       text check (char_length(result) <= 8000),
  steps        int,
  cost_cents   int,
  requested_by uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  started_at   timestamptz,
  finished_at  timestamptz
);
create index computer_jobs_ws on computer_jobs (workspace_id, created_at);

alter table computers     enable row level security;
alter table computer_jobs enable row level security;

-- Members see the computer and its jobs; the people who can approve bot work can start, stop and queue.
create policy computers_read on computers for select using (private.is_member(workspace_id));
create policy computers_write on computers for insert with check (private.has_role(workspace_id, array['owner','admin','sales','estimator','project_manager']::member_role[]));
create policy computers_update on computers for update using (private.has_role(workspace_id, array['owner','admin','sales','estimator','project_manager']::member_role[]));

create policy jobs_read on computer_jobs for select using (private.is_member(workspace_id));
create policy jobs_insert on computer_jobs for insert with check (private.has_role(workspace_id, array['owner','admin','sales','estimator','project_manager']::member_role[]));
create policy jobs_update on computer_jobs for update using (private.has_role(workspace_id, array['owner','admin','sales','estimator','project_manager']::member_role[]));
