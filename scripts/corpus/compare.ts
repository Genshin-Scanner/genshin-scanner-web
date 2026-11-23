import { isDeepStrictEqual } from "node:util";
import type { Artifact, ArtifactDraft } from "../../packages/good/src";
import type { RawItem } from "./scan";

function differences(draft: ArtifactDraft, expected: Artifact) {
  const keys = Object.keys({ ...draft, ...expected }) as (keyof Artifact)[];
  return keys.filter((key) => !isDeepStrictEqual(draft[key], expected[key]));
}

// Minimum-cost alignment localizes omissions and repeats for the diagnostic report.
// The regression assertion still compares every artifact in the original order.
export function compare(items: RawItem[], expected: Artifact[]) {
  const costs = Array.from({ length: items.length + 1 }, () =>
    new Array<number>(expected.length + 1).fill(0),
  );
  const penalties = items.map((item) =>
    expected.map(
      (ref) => differences(item.draft, ref).length / Object.keys(ref).length,
    ),
  );
  for (let i = 0; i <= items.length; i++) costs[i][0] = i;
  for (let j = 0; j <= expected.length; j++) costs[0][j] = j;
  for (let i = 1; i <= items.length; i++) {
    for (let j = 1; j <= expected.length; j++) {
      costs[i][j] = Math.min(
        costs[i - 1][j] + 1,
        costs[i][j - 1] + 1,
        costs[i - 1][j - 1] + penalties[i - 1][j - 1],
      );
    }
  }

  const missing: number[] = [];
  const extra: number[] = [];
  const mismatches: {
    expectedIndex: number;
    detectedIndex: number;
    time: number;
    fields: string[];
    issues: string[];
  }[] = [];
  let i = items.length,
    j = expected.length;
  while (i || j) {
    if (
      i &&
      j &&
      costs[i][j] === costs[i - 1][j - 1] + penalties[i - 1][j - 1]
    ) {
      const expectedIndex = j,
        detectedIndex = i;
      const item = items[--i];
      const fields = differences(item.draft, expected[--j]);
      if (fields.length || item.issues.length)
        mismatches.push({
          expectedIndex,
          detectedIndex,
          time: item.time,
          fields,
          issues: item.issues,
        });
    } else if (i && costs[i][j] === costs[i - 1][j] + 1) extra.push(i--);
    else missing.push(j--);
  }
  return {
    expected: expected.length,
    detected: items.length,
    flagged: items.filter((item) => item.issues.length).length,
    exact:
      expected.length -
      missing.length -
      mismatches.filter((row) => row.fields.length).length,
    falseAccepts:
      mismatches.filter((row) => row.fields.length && !row.issues.length)
        .length +
      extra.filter((index) => !items[index - 1].issues.length).length,
    missing: missing.reverse(),
    extra: extra.reverse(),
    mismatches: mismatches.reverse(),
  };
}
