import { STAGES_REQUIRE_RECORDING, type Stage } from "@/lib/constants";

export function stageRequiresRecording(stage: Stage) {
  return STAGES_REQUIRE_RECORDING.includes(stage);
}

export function assertRecordingForStage(
  stage: Stage,
  recordUrl: string | null | undefined,
) {
  if (stageRequiresRecording(stage) && !recordUrl) {
    throw new Error(`「${stage}」阶段必须上传录音后再提交`);
  }
}
