-- LOCAL TEST ONLY: RLS + invariant checks for 0006_lyrixis_voices.sql.
-- Run: scripts/voices-db-test.sh  (plain Postgres + database/tests/supabase_shim.sql). Rolls back.
begin;
set local client_min_messages = warning;

-- fixtures (as superuser)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'buyer-a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'buyer-b@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'creator@example.test'),
  ('00000000-0000-0000-0000-00000000000d', 'awad@apixis.dev');
create temp table ids as
  select (select id from public.users where email='buyer-a@example.test') ua,
         (select id from public.users where email='buyer-b@example.test') ub,
         (select id from public.users where email='creator@example.test') uc,
         (select id from public.users where email='awad@apixis.dev') uadm;
grant select on ids to anon, authenticated;

insert into public.voice_creators (id, user_id, handle, display_name, adult_attested_at)
  select '10000000-0000-0000-0000-000000000001', uc, 'test-creator', 'Test Creator', now() from ids;
insert into public.voices (id, slug, creator_id, display_name, status, provider, provider_voice_ref) values
  ('20000000-0000-0000-0000-000000000001', 'active-voice', '10000000-0000-0000-0000-000000000001', 'Active', 'active', 'demo', 'SECRET-REF-1'),
  ('20000000-0000-0000-0000-000000000002', 'draft-voice', '10000000-0000-0000-0000-000000000001', 'Draft', 'draft', 'demo', 'SECRET-REF-2');
insert into public.voice_training_uploads (voice_id, creator_id, storage_path, mime_type, bytes)
  values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 't/1.wav', 'audio/wav', 1000);
insert into public.voice_workspaces (id, name, owner_user_id) select '30000000-0000-0000-0000-00000000000a', 'WS A', ua from ids;
insert into public.voice_workspaces (id, name, owner_user_id) select '30000000-0000-0000-0000-00000000000b', 'WS B', ub from ids;
insert into public.voice_workspace_members (workspace_id, user_id, role)
  select '30000000-0000-0000-0000-00000000000a'::uuid, ua, 'owner' from ids union all
  select '30000000-0000-0000-0000-00000000000b'::uuid, ub, 'owner' from ids;
insert into public.voice_scripts (id, workspace_id, body, script_hash)
  values ('40000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', 'مرحبا بكم — welcome', 'h');
insert into public.voice_purchases (id, workspace_id, buyer_user_id, voice_id, creator_id, script_id, status, funding,
  price_ixis, idempotency_key, terms_version, terms_hash, terms_snapshot)
  select '50000000-0000-0000-0000-00000000000a', '30000000-0000-0000-0000-00000000000a', ua,
         '20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
         '40000000-0000-0000-0000-00000000000a', 'payment_held', 'wallet', 500, 'idem-a', 'license-v1', 'th', '{"price_ixis":500}'::jsonb from ids;

-- helper to act as a user
create or replace function pg_temp.act_as(auth_id text) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', auth_id, true);
  execute 'set local role authenticated';
end $$;

-- 1) anon sees only active voices, no provider ref column
set local role anon;
do $$ begin
  if (select count(*) from public.voices) <> 1 then raise exception 'FAIL anon voice visibility'; end if;
  begin
    perform provider_voice_ref from public.voices;
    raise exception 'FAIL anon can read provider_voice_ref';
  exception when insufficient_privilege then null; end;
  if (select count(*) from public.voice_training_uploads) <> 0 then raise exception 'FAIL anon sees training uploads'; end if;
  if (select count(*) from public.voice_scripts) <> 0 then raise exception 'FAIL anon sees scripts'; end if;
  begin
    insert into public.voices (slug, creator_id, display_name) values ('x-hack', '10000000-0000-0000-0000-000000000001', 'x');
    raise exception 'FAIL anon insert allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- 2) buyer B cannot see workspace A's scripts / purchases (cross-customer isolation)
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
do $$ begin
  if (select count(*) from public.voice_scripts) <> 0 then raise exception 'FAIL B sees A scripts'; end if;
  if (select count(*) from public.voice_purchases) <> 0 then raise exception 'FAIL B sees A purchases'; end if;
  if (select count(*) from public.voice_workspaces) <> 1 then raise exception 'FAIL B workspace visibility'; end if;
  update public.voice_purchases set status = 'refunded';  -- no update policy → 0 rows
  if (select count(*) from public.voice_training_uploads) <> 0 then raise exception 'FAIL B sees training uploads'; end if;
end $$;
reset role;

-- 3) buyer A sees own script + purchase; Arabic round-trips byte-exact
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
do $$ begin
  if (select body from public.voice_scripts) <> 'مرحبا بكم — welcome' then raise exception 'FAIL arabic round trip'; end if;
  if (select count(*) from public.voice_purchases) <> 1 then raise exception 'FAIL A purchase visibility'; end if;
end $$;
reset role;

-- 4) creator sees own draft + training metadata, not the buyer's script body
select pg_temp.act_as('00000000-0000-0000-0000-00000000000c');
do $$ begin
  if (select count(*) from public.voices) <> 2 then raise exception 'FAIL creator own voices'; end if;
  if (select count(*) from public.voice_training_uploads) <> 1 then raise exception 'FAIL creator training meta'; end if;
  if (select count(*) from public.voice_scripts) <> 0 then raise exception 'FAIL creator sees scripts'; end if;
  if (select count(*) from public.voice_purchases) <> 1 then raise exception 'FAIL creator sees purchases of own voice'; end if;
end $$;
reset role;

-- 5) owner email is Voices admin; admin still cannot read script bodies from a browser session
select pg_temp.act_as('00000000-0000-0000-0000-00000000000d');
do $$ begin
  if not public.voices_is_admin() then raise exception 'FAIL owner admin'; end if;
  if (select count(*) from public.voices) <> 2 then raise exception 'FAIL admin voices'; end if;
  if (select count(*) from public.voice_scripts) <> 0 then raise exception 'FAIL admin reads scripts'; end if;
end $$;
reset role;

-- 6) terms snapshot frozen
do $$ begin
  begin
    update public.voice_purchases set price_ixis = 1 where id = '50000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL price mutable';
  exception when sqlstate 'P0001' then null; end;
  begin
    update public.voice_purchases set terms_snapshot = '{}' where id = '50000000-0000-0000-0000-00000000000a';
    raise exception 'FAIL snapshot mutable';
  exception when sqlstate 'P0001' then null; end;
  update public.voice_purchases set status = 'fulfilled' where id = '50000000-0000-0000-0000-00000000000a';
end $$;

-- 7) duplicate purchase idempotency key rejected
do $$ begin
  begin
    insert into public.voice_purchases (workspace_id, buyer_user_id, voice_id, creator_id, status, funding, price_ixis,
      idempotency_key, terms_version, terms_hash, terms_snapshot)
      select '30000000-0000-0000-0000-00000000000a', ua, '20000000-0000-0000-0000-000000000001',
        '10000000-0000-0000-0000-000000000001', 'payment_held', 'wallet', 500, 'idem-a', 'v', 'h', '{}' from ids;
    raise exception 'FAIL duplicate idempotency accepted';
  exception when unique_violation then null; end;
end $$;

-- 8) ledger: balanced tx ok, duplicate capture key no-ops, unbalanced rejected, append-only
insert into public.voice_ledger_accounts (code, kind) values ('wallet_clearing','asset'), ('lyrixis_revenue','revenue');
insert into public.voice_ledger_accounts (code, kind, owner_creator_id, bucket)
  values ('creator:t:pending','liability','10000000-0000-0000-0000-000000000001','pending');
savepoint s1;
do $$
declare tx uuid;
begin
  insert into public.voice_ledger_transactions (idempotency_key, kind) values ('capture:res_1', 'purchase_capture') returning id into tx;
  insert into public.voice_ledger_entries (transaction_id, account_id, amount_ixis, line)
    select tx, id, 500, 'customer_payment' from public.voice_ledger_accounts where code='wallet_clearing';
  insert into public.voice_ledger_entries (transaction_id, account_id, amount_ixis, line)
    select tx, id, -333, 'creator_share' from public.voice_ledger_accounts where code='creator:t:pending';
  insert into public.voice_ledger_entries (transaction_id, account_id, amount_ixis, line)
    select tx, id, -167, 'licensing_amount' from public.voice_ledger_accounts where code='lyrixis_revenue';
end $$;
set constraints all immediate;
do $$ begin
  insert into public.voice_ledger_transactions (idempotency_key, kind) values ('capture:res_1', 'purchase_capture')
    on conflict (idempotency_key) do nothing;
  if (select count(*) from public.voice_ledger_transactions where idempotency_key='capture:res_1') <> 1 then raise exception 'FAIL dup capture'; end if;
  begin
    update public.voice_ledger_entries set amount_ixis = 1;
    raise exception 'FAIL ledger mutable';
  exception when sqlstate 'P0001' then null; end;
end $$;
set constraints all deferred;
do $$
declare tx uuid;
begin
  insert into public.voice_ledger_transactions (idempotency_key, kind) values ('bad', 'adjustment') returning id into tx;
  insert into public.voice_ledger_entries (transaction_id, account_id, amount_ixis, line)
    select tx, id, 5, 'adjustment' from public.voice_ledger_accounts where code='wallet_clearing';
  begin
    set constraints all immediate;
    raise exception 'FAIL unbalanced accepted';
  exception when sqlstate 'P0001' then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
end $$;

-- 9) RPCs: idempotent ledger post, allowance never negative, browsers cannot call
do $$
declare r record; r2 record;
begin
  select * into r from public.voice_post_ledger('capture:res_rpc', 'purchase_capture', null, 'test',
    '[{"account":"wallet_clearing","kind":"asset","amount":100,"line":"customer_payment"},
      {"account":"lyrixis_revenue","kind":"revenue","amount":-100,"line":"licensing_amount"}]'::jsonb);
  select * into r2 from public.voice_post_ledger('capture:res_rpc', 'purchase_capture', null, 'test',
    '[{"account":"wallet_clearing","kind":"asset","amount":100,"line":"customer_payment"},
      {"account":"lyrixis_revenue","kind":"revenue","amount":-100,"line":"licensing_amount"}]'::jsonb);
  if r.duplicate or not r2.duplicate or r.transaction_id <> r2.transaction_id then raise exception 'FAIL rpc idempotency'; end if;
  if (select count(*) from public.voice_ledger_entries where transaction_id = r.transaction_id) <> 2 then raise exception 'FAIL dup entries'; end if;
  update public.voice_workspaces set allowance_voiceovers = 1 where id = '30000000-0000-0000-0000-00000000000a';
  if not public.voice_take_allowance('30000000-0000-0000-0000-00000000000a', 1) then raise exception 'FAIL take'; end if;
  if public.voice_take_allowance('30000000-0000-0000-0000-00000000000a', 1) then raise exception 'FAIL allowance negative'; end if;
  perform public.voice_restore_allowance('30000000-0000-0000-0000-00000000000a', 1);
  if (select allowance_voiceovers from public.voice_workspaces where id = '30000000-0000-0000-0000-00000000000a') <> 1 then raise exception 'FAIL restore'; end if;
end $$;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
do $$ begin
  begin
    perform public.voice_take_allowance('30000000-0000-0000-0000-00000000000a', 1);
    raise exception 'FAIL browser can call rpc';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select 'ALL VOICES DB TESTS PASSED' as result;
rollback;
