# 无锡片区业务工作台

面向高校校园团队（T0 / T1 / T2）的业务管理系统：用户跟进漏斗、六维评级、成员能力模型、每日/每周复盘、录音库。

技术栈：Next.js 16 · Tailwind CSS 4 · Supabase（Auth / Postgres / Storage）· Recharts

## 快速开始（演示模式）

未配置 Supabase 时默认进入演示模式（localStorage），可直接体验完整流程：

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)，选择演示身份（陈负责人 / 林组长 / 王成员）进入。

## 接入 Supabase

1. 复制环境变量：

```bash
cp .env.local.example .env.local
```

2. 在 Supabase 项目执行迁移：

```bash
# 使用 Supabase CLI
supabase db push
# 或在 SQL Editor 中执行 supabase/migrations/20260810000001_init.sql
```

3. 填写 `.env.local` 中的 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY`，并设置 `NEXT_PUBLIC_DEMO_MODE=false`。

4. 注册账号后完善档案即可使用。录音上传路径：`recordings/{owner_id}/{user_id}/{timestamp}.m4a`。


## 数据层

业务页面统一走 `src/lib/data`：

- 未配置 Supabase → 演示模式（localStorage）
- 已配置并 `NEXT_PUBLIC_DEMO_MODE=false` → Supabase（含 Storage 录音上传与签名播放）

录音路径：`recordings/{owner_id}/{user_id}/{timestamp}.m4a`

## 功能清单

| 模块 | 说明 |
|---|---|
| 登录/注册 | Supabase Auth；演示模式一键选身份 |
| 全局看板 | T0：漏斗、等级分布、成员排名、CSV 导出 |
| 用户管理 | 列表筛选、六维雷达、阶段推进、录音上传、时间线 |
| 成员能力 | 9 维评分、上周 vs 本周、近 8 周趋势、状态预警 |
| 复盘 | 每日复盘、每周复盘（自动漏斗快照） |
| 录音库 | 按成员/用户/阶段筛选，在线播放 |

## 业务常量

集中在 `src/lib/constants.ts`：阶段枚举、等级规则、六维维度、能力维度、角色。

等级规则：S=≥5 个维度 3 分且无 1 分；A=2-4 个 3 分且无 1 分；B=0-1 个 3 分或有 1-2 个 1 分；C=≥3 个 1 分。

## 脚本

```bash
npm run dev      # 开发
npm run build    # 生产构建
npm run start    # 启动生产服务
npm run lint     # ESLint
```
