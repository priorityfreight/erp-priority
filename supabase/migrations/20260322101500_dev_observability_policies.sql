grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on audit_logs to anon, authenticated;
grant select, insert, update, delete on automation_logs to anon, authenticated;

alter table audit_logs enable row level security;
drop policy if exists "dev_select_audit_logs" on audit_logs;
drop policy if exists "dev_insert_audit_logs" on audit_logs;
drop policy if exists "dev_update_audit_logs" on audit_logs;
drop policy if exists "dev_delete_audit_logs" on audit_logs;
create policy "dev_select_audit_logs" on audit_logs for select using (true);
create policy "dev_insert_audit_logs" on audit_logs for insert with check (true);
create policy "dev_update_audit_logs" on audit_logs for update using (true);
create policy "dev_delete_audit_logs" on audit_logs for delete using (true);

alter table automation_logs enable row level security;
drop policy if exists "dev_select_automation_logs" on automation_logs;
drop policy if exists "dev_insert_automation_logs" on automation_logs;
drop policy if exists "dev_update_automation_logs" on automation_logs;
drop policy if exists "dev_delete_automation_logs" on automation_logs;
create policy "dev_select_automation_logs" on automation_logs for select using (true);
create policy "dev_insert_automation_logs" on automation_logs for insert with check (true);
create policy "dev_update_automation_logs" on automation_logs for update using (true);
create policy "dev_delete_automation_logs" on automation_logs for delete using (true);
