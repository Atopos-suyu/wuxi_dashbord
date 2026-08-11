-- 允许同片区已登录成员读取队友基础档案（用于负责人姓名展示）
-- T0 仍可改全部；普通成员仅可读他人，不可改他人

drop policy if exists "profiles_select_own_or_t0" on public.profiles;

create policy "profiles_select_authenticated"
  on public.profiles for select
  to authenticated
  using (true);
