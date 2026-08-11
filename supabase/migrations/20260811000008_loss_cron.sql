-- V2.5：流失原因 + 定时推送辅助

alter table public.users
  add column if not exists loss_reason text;

alter table public.users
  drop constraint if exists users_loss_reason_check;

alter table public.users
  add constraint users_loss_reason_check
  check (
    loss_reason is null
    or loss_reason in (
      '价格敏感',
      '家长反对',
      '竞品截流',
      '时间冲突',
      '意向不足',
      '失联',
      '其他'
    )
  );

create or replace view public.v_loss_by_reason as
select
  coalesce(u.school_region, p.school_region, '无锡学院') as school_region,
  coalesce(u.loss_reason, '未标注') as loss_reason,
  count(*)::int as user_count
from public.users u
left join public.profiles p on p.id = u.owner_id
where u.stage = '流失'
group by 1, 2;
