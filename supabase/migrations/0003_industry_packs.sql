-- Industry packs. The core tables stay the same for every industry; each workspace names the pack it runs on,
-- and the pack decides its bots and its own records (the construction pack keeps `bids`).

alter table workspaces add column pack text not null default 'construction' check (char_length(pack) between 1 and 40);

-- Tasks point at any pack record, not only bids.
alter table tasks rename column bid_id to ref;

-- Packs add their own approval kinds (construction: decide).
alter table approvals drop constraint approvals_kind_check;
alter table approvals add constraint approvals_kind_check check (kind ~ '^[a-z_]{1,40}$');

-- The bot team now comes from the pack, passed in by the app, so the roster lives in one place.
-- ws_bots is a JSON array of {id, name, role}; the main bot ("chief") must be in it.
drop function create_workspace(text, text, text);

create or replace function create_workspace(ws_name text, ws_pack text, ws_trade text, your_name text, ws_bots jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  if auth.uid() is null then raise exception 'sign in first'; end if;
  if jsonb_typeof(ws_bots) <> 'array' or jsonb_array_length(ws_bots) not between 1 and 40 then raise exception 'bots must be a list of 1 to 40'; end if;
  if not exists (select 1 from jsonb_array_elements(ws_bots) b where b ->> 'id' = 'chief') then raise exception 'the main bot is missing'; end if;
  if exists (
    select 1 from jsonb_array_elements(ws_bots) b
    where coalesce(b ->> 'id', '') !~ '^[a-z_]{1,40}$' or char_length(coalesce(b ->> 'name', '')) not between 1 and 60 or char_length(coalesce(b ->> 'role', '')) > 300
  ) then raise exception 'a bot is not valid'; end if;

  insert into workspaces (name, pack, trade, created_by) values (ws_name, ws_pack, ws_trade, auth.uid()) returning id into ws;
  insert into members (workspace_id, user_id, role, display_name) values (ws, auth.uid(), 'owner', coalesce(your_name, ''));
  insert into bots (workspace_id, id, name, role, sort)
    select ws, b ->> 'id', b ->> 'name', coalesce(b ->> 'role', ''), (n - 1)::int
    from jsonb_array_elements(ws_bots) with ordinality as t(b, n);
  return ws;
end;
$$;

revoke execute on function create_workspace(text, text, text, text, jsonb) from public, anon;
grant execute on function create_workspace(text, text, text, text, jsonb) to authenticated;
