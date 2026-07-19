-- Allow deletion of dumpster status history only when the parent dumpster is
-- retired, so admin cleanup can remove retired inventory records.

create or replace function private.guard_dumpster_status_history_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent_dumpster_status public.dumpster_status;
begin
  if tg_op = 'DELETE' then
    select status into parent_dumpster_status
    from public.dumpsters
    where id = old.dumpster_id;

    if parent_dumpster_status = 'retired' then
      return old;
    end if;
  end if;

  raise exception '% is append-only', tg_table_name;
end;
$$;

drop trigger if exists dumpster_status_history_append_only on public.dumpster_status_history;

create trigger dumpster_status_history_append_only
before update or delete on public.dumpster_status_history
for each row execute function private.guard_dumpster_status_history_mutation();
