export interface PerformanceMetrics {
  iterations: number;
  times: number[];
  average: number;
  min: number;
  max: number;
  median: number;
}

export function summarize(times: number[]): PerformanceMetrics {
  const sorted = [...times].sort((a, b) => a - b);
  return {
    iterations: times.length,
    times,
    average: times.reduce((sum, t) => sum + t, 0) / times.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    median: sorted[Math.floor(sorted.length / 2)],
  };
}

/** Human-readable Legacy vs Core comparison. */
export function formatComparison(legacy: PerformanceMetrics, core: PerformanceMetrics): string {
  const diff = core.average - legacy.average;
  const pct = legacy.average === 0 ? 0 : (Math.abs(diff) / legacy.average) * 100;
  const verdict =
    diff <= 0
      ? `Core is ${pct.toFixed(1)}% faster than Legacy`
      : `Core is ${pct.toFixed(1)}% slower than Legacy`;

  const row = (label: string, m: PerformanceMetrics): string =>
    `  ${label} avg ${m.average.toFixed(1)}ms | min ${m.min}ms | max ${m.max}ms | median ${m.median}ms`;

  return [
    `Performance comparison (${legacy.iterations} iteration(s))`,
    row('Legacy:', legacy),
    row('Core:  ', core),
    `  ${verdict}`,
  ].join('\n');
}
