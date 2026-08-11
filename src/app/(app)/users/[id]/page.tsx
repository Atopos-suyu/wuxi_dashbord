"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  LOSS_REASONS,
  PARENT_ATTITUDES,
  SIX_DIM_KEYS,
  STAGE_LOG_STATUSES,
  STAGES,
  STAGES_REQUIRE_RECORDING,
  type LossReason,
  type SixDimScore,
  type Stage,
  type StageLogStatus,
} from "@/lib/constants";
import { calcLevel, normalizeSixDim } from "@/lib/level";
import { canSeeMember } from "@/lib/permissions";
import { stageRequiresRecording } from "@/lib/recording-qa";
import { useSession } from "@/components/providers/session-provider";
import {
  addStageLog,
  completeUserTodo,
  getUser,
  listProfiles,
  listStageLogs,
  uploadRecording,
  upsertUser,
} from "@/lib/data";
import { useLiveQuery } from "@/lib/data/use-live-query";
import { ScoreRadar } from "@/components/charts/radar-chart";
import { LevelBadge } from "@/components/users/level-badge";
import { StageBadge } from "@/components/users/stage-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/ui/empty";
import { LoadingBlock } from "@/components/ui/loading";
import { formatDateTime } from "@/lib/utils";

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { profile } = useSession();

  const {
    data: user,
    loading,
    reload,
  } = useLiveQuery(() => getUser(params.id), [params.id]);
  const { data: logs = [], reload: reloadLogs } = useLiveQuery(
    () => listStageLogs(params.id),
    [params.id],
  );
  const { data: profiles = [] } = useLiveQuery(() => listProfiles(), []);

  const [six, setSix] = useState<SixDimScore | null>(null);
  const [note, setNote] = useState("");
  const [nextStage, setNextStage] = useState<Stage>("面试");
  const [status, setStatus] = useState<StageLogStatus>("done");
  const [recordUrl, setRecordUrl] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [lossReason, setLossReason] = useState<LossReason | "">("");

  useEffect(() => {
    if (user) {
      const idx = Math.min(STAGES.indexOf(user.stage) + 1, STAGES.length - 1);
      setNextStage(STAGES[idx]);
      setLossReason((user.loss_reason as LossReason) || "");
    }
  }, [user?.id, user?.stage, user?.loss_reason]);

  const score = six ?? user?.six_dim_score ?? null;
  const liveLevel = score ? calcLevel(normalizeSixDim(score)) : "B";
  const radarData = useMemo(
    () =>
      score
        ? SIX_DIM_KEYS.map((k) => ({
            subject: k.replace("意识", "").replace("学习", "学"),
            score: score[k],
          }))
        : [],
    [score],
  );

  if (loading) return <LoadingBlock />;

  if (!user || !profile || !score) {
    return (
      <EmptyState
        title="用户不存在或无权访问"
        action={
          <Button className="mt-2" onClick={() => router.push("/users")}>
            返回列表
          </Button>
        }
      />
    );
  }

  const owner = profiles.find((p) => p.id === user.owner_id) ?? user.owner;
  if (
    user.owner_id !== profile.id &&
    (!owner || !canSeeMember(profile, owner, profiles))
  ) {
    return <EmptyState title="无权查看该用户" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="section-title text-2xl md:text-3xl">{user.name}</h1>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {user.major} · {user.channel} · {user.contact || "无联系方式"}
          </p>
        </div>
        <div className="flex gap-1.5">
          <LevelBadge level={liveLevel} />
          <StageBadge stage={user.stage} />
        </div>
      </div>

      <section className="panel p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold">六维评分</h2>
          <span className="text-xs text-[var(--muted)]">
            改分后自动重算等级 → {liveLevel}
          </span>
        </div>
        <ScoreRadar
          data={radarData}
          max={3}
          series={[{ key: "score", color: "#1F6B8A", name: "当前" }]}
        />
        <div className="mt-4 grid gap-3">
          {SIX_DIM_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-3">
              <Label className="w-36 shrink-0 text-xs md:text-sm">{key}</Label>
              <input
                type="range"
                min={1}
                max={3}
                step={1}
                value={score[key]}
                className="flex-1 accent-[var(--lake)]"
                onChange={(e) => {
                  setSix({
                    ...score,
                    [key]: Number(e.target.value),
                  } as SixDimScore);
                }}
              />
              <span className="w-4 text-sm font-semibold">{score[key]}</span>
            </div>
          ))}
        </div>
        <Button
          className="mt-4 w-full"
          onClick={async () => {
            try {
              await upsertUser({
                id: user.id,
                name: user.name,
                owner_id: user.owner_id,
                six_dim_score: normalizeSixDim(score),
              });
              setSix(null);
              reload();
              toast.success(`评分已保存，等级：${liveLevel}`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "保存失败");
            }
          }}
        >
          保存六维评分
        </Button>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-semibold">阶段推进</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>推进到</Label>
            <Select
              value={nextStage}
              onChange={(e) => setNextStage(e.target.value as Stage)}
            >
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <Label>状态</Label>
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value as StageLogStatus)}
            >
              {STAGE_LOG_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "doing" ? "进行中" : s === "done" ? "完成" : "失败"}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>本次说明</Label>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="聊了什么、结果如何…"
          />
        </div>
        {nextStage === "流失" ? (
          <div className="space-y-2">
            <Label>流失原因（必选）</Label>
            <Select
              value={lossReason}
              onChange={(e) => setLossReason(e.target.value as LossReason)}
            >
              <option value="">请选择</option>
              {LOSS_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <div className="space-y-2">
          <Label>
            上传录音（手机可录）
            {stageRequiresRecording(nextStage) ? (
              <span className="ml-1 text-[var(--accent)]">
                · 「{nextStage}」必传
              </span>
            ) : null}
          </Label>
          <Input
            type="file"
            accept="audio/*,.m4a,.mp3,.wav"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file || !profile) return;
              setUploading(true);
              try {
                const url = await uploadRecording(file, profile.id, user.id);
                setRecordUrl(url);
                setPreviewUrl(
                  url.startsWith("http") || url.startsWith("blob:")
                    ? url
                    : null,
                );
                toast.success("录音已上传");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "上传失败");
              } finally {
                setUploading(false);
              }
            }}
          />
          {previewUrl ? (
            <audio controls className="mt-2 w-full" src={previewUrl} />
          ) : recordUrl ? (
            <p className="text-xs text-[var(--muted)]">已上传：{recordUrl}</p>
          ) : stageRequiresRecording(nextStage) ? (
            <p className="text-xs text-[var(--accent)]">
              必传阶段：{STAGES_REQUIRE_RECORDING.join(" / ")}
            </p>
          ) : null}
        </div>
        <Button
          className="w-full"
          disabled={
            uploading ||
            (stageRequiresRecording(nextStage) && !recordUrl) ||
            (nextStage === "流失" && !lossReason)
          }
          onClick={async () => {
            try {
              if (nextStage === "流失" && !lossReason) {
                throw new Error("请选择流失原因");
              }
              await addStageLog({
                user_id: user.id,
                stage: nextStage,
                status,
                note,
                record_url: recordUrl,
                owner_id: profile.id,
                advanceUser: status !== "failed",
              });
              if (status !== "failed" && nextStage === "流失") {
                await upsertUser({
                  id: user.id,
                  name: user.name,
                  owner_id: user.owner_id,
                  stage: "流失",
                  loss_reason: lossReason,
                });
              }
              setNote("");
              setRecordUrl(null);
              setPreviewUrl(null);
              reload();
              reloadLogs();
              toast.success(`已记录：${nextStage}`);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "提交失败");
            }
          }}
        >
          提交推进记录
        </Button>
      </section>

      <section className="panel space-y-3 p-4">
        <h2 className="font-semibold">跟进信息</h2>
        {user.stage === "流失" ? (
          <div className="space-y-2">
            <Label>流失原因</Label>
            <Select
              value={lossReason || user.loss_reason || ""}
              onChange={async (e) => {
                const value = e.target.value as LossReason;
                setLossReason(value);
                await upsertUser({
                  id: user.id,
                  name: user.name,
                  owner_id: user.owner_id,
                  loss_reason: value,
                });
                reload();
                toast.success("流失原因已更新");
              }}
            >
              <option value="">未标注</option>
              {LOSS_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
        ) : null}
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="家长态度">
            <Select
              defaultValue={user.parent_attitude}
              onChange={async (e) => {
                await upsertUser(
                  {
                    id: user.id,
                    name: user.name,
                    owner_id: user.owner_id,
                    parent_attitude: e.target.value,
                  },
                  { changedBy: profile.id },
                );
                reload();
              }}
            >
              {PARENT_ATTITUDES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="成交金额">
            <Input
              type="number"
              defaultValue={user.deal_amount ?? ""}
              onBlur={async (e) => {
                await upsertUser({
                  id: user.id,
                  name: user.name,
                  owner_id: user.owner_id,
                  deal_amount: e.target.value ? Number(e.target.value) : null,
                });
                reload();
              }}
            />
          </Field>
          <Field label="下一步待办">
            <Input
              defaultValue={user.next_action}
              onBlur={async (e) => {
                await upsertUser({
                  id: user.id,
                  name: user.name,
                  owner_id: user.owner_id,
                  next_action: e.target.value,
                });
                reload();
              }}
            />
          </Field>
          <Field label="待办截止">
            <Input
              type="date"
              defaultValue={user.next_action_due ?? ""}
              onBlur={async (e) => {
                await upsertUser({
                  id: user.id,
                  name: user.name,
                  owner_id: user.owner_id,
                  next_action_due: e.target.value || null,
                });
                reload();
              }}
            />
          </Field>
        </div>
        {(user.next_action || user.next_action_due) && (
          <Button
            size="sm"
            variant="secondary"
            onClick={async () => {
              await completeUserTodo(user.id);
              reload();
              toast.success("待办已完成，逾期预警将清除");
            }}
          >
            标记待办完成
          </Button>
        )}
        {user.contact ? (
          <p className="text-xs text-[var(--muted)]">
            联系方式：{user.contact}{" "}
            <button
              type="button"
              className="text-[var(--lake)] underline"
              onClick={async () => {
                await navigator.clipboard.writeText(user.contact);
                toast.success("已复制联系方式");
              }}
            >
              复制
            </button>
          </p>
        ) : null}
        <Field label="家庭情况">
          <Textarea
            defaultValue={user.family_situation}
            onBlur={async (e) => {
              await upsertUser({
                id: user.id,
                name: user.name,
                owner_id: user.owner_id,
                family_situation: e.target.value,
              });
              reload();
            }}
          />
        </Field>
        <Field label="总备注">
          <Textarea
            defaultValue={user.remark}
            onBlur={async (e) => {
              await upsertUser({
                id: user.id,
                name: user.name,
                owner_id: user.owner_id,
                remark: e.target.value,
              });
              reload();
            }}
          />
        </Field>
      </section>

      <section className="panel p-4">
        <h2 className="mb-3 font-semibold">跟进时间线</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">暂无推进记录</p>
        ) : (
          <ol className="space-y-4">
            {logs.map((log) => (
              <li
                key={log.id}
                className="relative border-l-2 border-[var(--line)] pl-4"
              >
                <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-[var(--lake)]" />
                <div className="flex flex-wrap items-center gap-2">
                  <StageBadge stage={log.stage} />
                  <span className="text-xs text-[var(--muted)]">
                    {formatDateTime(log.created_at)} · {log.owner?.full_name}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--ink-soft)]">
                  {log.note || "（无备注）"}
                </p>
                {log.record_url &&
                (log.record_url.startsWith("http") ||
                  log.record_url.startsWith("blob:")) ? (
                  <audio className="mt-2 w-full" controls src={log.record_url} />
                ) : null}
                {log.record_url?.startsWith("demo://") ||
                (log.record_url &&
                  !log.record_url.startsWith("http") &&
                  !log.record_url.startsWith("blob:")) ? (
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    录音：{log.record_url}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
