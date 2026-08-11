-- V2.4：录音质检字段 + 企微推送去重记录

alter table public.user_stage_logs
  add column if not exists qa_status text
    check (qa_status is null or qa_status in ('pending', 'passed', 'rejected')),
  add column if not exists qa_note text not null default '',
  add column if not exists qa_by uuid references public.profiles(id),
  add column if not exists qa_at timestamptz;

create index if not exists stage_logs_qa_pending_idx
  on public.user_stage_logs(qa_status, created_at desc)
  where qa_status = 'pending';

-- 企微推送去重（按 alert_key / source）
create table if not exists public.outbound_pushes (
  id uuid primary key default gen_random_uuid(),
  channel text not null default 'wecom',
  source_key text not null,
  payload text not null default '',
  pushed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (channel, source_key)
);

alter table public.outbound_pushes enable row level security;

drop policy if exists "outbound_select_leaders" on public.outbound_pushes;
drop policy if exists "outbound_insert_leaders" on public.outbound_pushes;

create policy "outbound_select_leaders"
  on public.outbound_pushes for select
  using (public.auth_role() in ('T3', 'T2'));

create policy "outbound_insert_leaders"
  on public.outbound_pushes for insert
  with check (public.auth_role() in ('T3', 'T2'));
