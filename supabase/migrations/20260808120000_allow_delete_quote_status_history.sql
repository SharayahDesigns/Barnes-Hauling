-- Allow admin cleanup of quote requests.
--
-- quote_status_history is written by a trigger whenever a quote's status
-- changes, and was strictly append-only, so any quote staff had ever touched
-- could not be deleted. Quote requests are pre-sale leads with no payment,
-- snapshot, or signature records attached, so removing them destroys no
-- financial or legal history.
--
-- UPDATE stays rejected: history rows may be removed with their parent quote,
-- but never rewritten.
create or replace function private.guard_quote_status_history_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    return old;
  end if;

  raise exception '% is append-only', tg_table_name;
end;
$$;

revoke all on function private.guard_quote_status_history_mutation()
  from public, anon, authenticated;

drop trigger if exists quote_status_history_append_only on public.quote_status_history;

create trigger quote_status_history_append_only
before update or delete on public.quote_status_history
for each row execute function private.guard_quote_status_history_mutation();
