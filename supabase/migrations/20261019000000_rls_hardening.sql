-- ROW LEVEL SECURITY: deny by default, for everyone but the server.
--
-- How Kandrop talks to the database: the browser NEVER does. Every read and write goes through the Next.js
-- server with the service-role key (which bypasses RLS) after the server has checked the session, the role
-- and the owner of the row. So the right policy for the `anon` and `authenticated` roles (the ones the public
-- API key and any logged-in Supabase user get) is NONE: no policy = every SELECT / INSERT / UPDATE / DELETE
-- from those roles is rejected. A "read your own rows" policy would only widen what a leaked or abused public
-- key could reach, so none is created. This script makes that rule complete and permanent. It is idempotent.

-- 1. RLS ON, and FORCED, for every table of the `public` schema (also tables added by future migrations
--    that forgot it: run this script again, or keep the event trigger below).
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('alter table public.%I force row level security', t.tablename);
  end loop;
end $$;

-- 2. No stray policies: whatever policy exists on a public table is removed (the design has none).
do $$
declare p record;
begin
  for p in select schemaname, tablename, policyname from pg_policies where schemaname = 'public' loop
    execute format('drop policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
  end loop;
end $$;

-- 3. Belt and braces: even with RLS the two public roles get no privilege at all on our tables, sequences
--    or functions (RPCs). The service role keeps what it has.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- 4. ...and the same for everything created from now on.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;

-- 5. A new table can never be left open by mistake: it gets RLS the moment it is created.
create or replace function public.kandrop_enable_rls_on_new_tables() returns event_trigger
language plpgsql as $$
declare obj record;
begin
  for obj in select * from pg_event_trigger_ddl_commands() where command_tag = 'CREATE TABLE' and schema_name = 'public' loop
    execute format('alter table %s enable row level security', obj.object_identity);
    execute format('alter table %s force row level security', obj.object_identity);
  end loop;
end $$;
drop event trigger if exists kandrop_rls_on_create_table;
create event trigger kandrop_rls_on_create_table on ddl_command_end when tag in ('CREATE TABLE') execute function public.kandrop_enable_rls_on_new_tables();
