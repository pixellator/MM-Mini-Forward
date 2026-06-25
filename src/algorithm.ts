/** B'(j) = Σ_i T[i][j] * belief[i] */
export function forwardStep(belief: number[], T: number[][]): number[] {
  const n = belief.length;
  const result = new Array(n).fill(0) as number[];
  for (let j = 0; j < n; j++) {
    for (let i = 0; i < n; i++) {
      result[j] += T[i][j] * belief[i];
    }
  }
  return result;
}

/** contributions[i][j] = T[i][j] * belief[i] — how much state i contributes to state j */
export function computeContributions(belief: number[], T: number[][]): number[][] {
  return T.map((row, i) => row.map(t => t * belief[i]));
}
