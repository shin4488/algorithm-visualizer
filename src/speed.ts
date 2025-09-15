export const BASE_STEP_MS = 600;
export const SPEED_COEFF = 0.7;
export const MIN_TIMER_MS = 4;

export function computeInterval(speed: number, min = 0.2, max = 10): number {
  const s = Math.min(max, Math.max(min, speed));
  const effective = SPEED_COEFF * s;
  const ms = Math.floor(BASE_STEP_MS / effective);
  return Math.max(MIN_TIMER_MS, ms);
}
