// Catmull-Rom keyframe helpers for per-species attack poses.
import type { Strike } from './types';

export const smoothstep = (u: number) => u * u * (3 - 2 * u);

/** Value of keyframe track `ch` of strike `s` at u (0..1): Catmull-Rom curve through keys.
 *  Motion flows through each pose (first and last keys are at rest). */
export function track(s: Strike, ch: string, u: number): number {
  const t = s.t, v = s[ch] as number[] | undefined;
  if (!v) return 0;
  const n = t.length;
  const tan = (i: number) => (i <= 0 || i >= n - 1 ? 0 : (v[i + 1] - v[i - 1]) / (t[i + 1] - t[i - 1]));
  for (let k = 1; k < n; k++) {
    if (u <= t[k]) {
      const h = t[k] - t[k - 1], f = (u - t[k - 1]) / h, f2 = f * f, f3 = f2 * f;
      return (2 * f3 - 3 * f2 + 1) * v[k - 1] + (f3 - 2 * f2 + f) * h * tan(k - 1)
        + (-2 * f3 + 3 * f2) * v[k] + (f3 - f2) * h * tan(k);
    }
  }
  return v[n - 1];
}
