import type { Level, SixDimScore } from "./constants";
import { SIX_DIM_KEYS } from "./constants";

/** S/A/B/C 评级：与文档规则一致 */
export function calcLevel(score: SixDimScore): Level {
  const values = SIX_DIM_KEYS.map((k) => Number(score[k] ?? 1));
  const threes = values.filter((v) => v === 3).length;
  const ones = values.filter((v) => v === 1).length;

  if (ones >= 3) return "C";
  if (threes >= 5 && ones === 0) return "S";
  if (threes >= 2 && threes <= 4 && ones === 0) return "A";
  if (threes <= 1 || (ones >= 1 && ones <= 2)) return "B";
  return "B";
}

export function normalizeSixDim(input: Partial<SixDimScore> | null | undefined): SixDimScore {
  const result = {} as SixDimScore;
  for (const key of SIX_DIM_KEYS) {
    const raw = Number(input?.[key] ?? 2);
    result[key] = Math.min(3, Math.max(1, Number.isFinite(raw) ? raw : 2));
  }
  return result;
}
