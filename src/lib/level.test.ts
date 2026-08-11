import { calcLevel } from "./level";
import type { SixDimScore } from "./constants";

function score(partial: Partial<SixDimScore>): SixDimScore {
  return {
    提前学习意识: 2,
    额外学习意识: 2,
    "学习AI/编程意识": 2,
    付费学习意识: 2,
    付费能力: 2,
    信任度: 2,
    ...partial,
  };
}

const cases: Array<[string, SixDimScore, string]> = [
  [
    "S",
    score({
      提前学习意识: 3,
      额外学习意识: 3,
      "学习AI/编程意识": 3,
      付费学习意识: 3,
      付费能力: 3,
      信任度: 2,
    }),
    "S",
  ],
  [
    "A",
    score({
      提前学习意识: 3,
      额外学习意识: 3,
      "学习AI/编程意识": 2,
      付费学习意识: 2,
      付费能力: 2,
      信任度: 2,
    }),
    "A",
  ],
  [
    "C",
    score({
      提前学习意识: 1,
      额外学习意识: 1,
      "学习AI/编程意识": 1,
      付费学习意识: 2,
      付费能力: 2,
      信任度: 2,
    }),
    "C",
  ],
];

for (const [name, input, expected] of cases) {
  const got = calcLevel(input);
  if (got !== expected) {
    throw new Error(`level ${name}: expected ${expected}, got ${got}`);
  }
}

console.log("level.test.ts passed");
