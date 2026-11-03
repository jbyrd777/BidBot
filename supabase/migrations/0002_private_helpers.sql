-- Keep the membership helpers out of the public API. Row level security still calls them;
-- nobody can call them directly over the API.
create schema if not exists private;
grant usage on schema private to authenticated;
alter function public.is_member(uuid) set schema private;
alter function public.has_role(uuid, member_role[]) set schema private;
alter function private.is_member(uuid) set search_path = public;
alter function private.has_role(uuid, member_role[]) set search_path = public;
revoke execute on function private.is_member(uuid) from public, anon;
revoke execute on function private.has_role(uuid, member_role[]) from public, anon;
grant execute on function private.is_member(uuid) to authenticated;
grant execute on function private.has_role(uuid, member_role[]) to authenticated;
