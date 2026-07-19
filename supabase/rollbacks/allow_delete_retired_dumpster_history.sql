create or replace function private.reject_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name;
end;
$$;

drop trigger if exists dumpster_status_history_append_only on public.dumpster_status_history;

create trigger dumpster_status_history_append_only
before update or delete on public.dumpster_status_history
for each row execute function private.reject_mutation();
