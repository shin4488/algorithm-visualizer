export type Step =
  | { t: 'compare'; i: number; j: number }
  | { t: 'swap'; i: number; j: number }
  | { t: 'pivot'; i: number | null }
  | { t: 'range'; lo: number | null; hi: number | null }
  | { t: 'markL'; i: number }
  | { t: 'markR'; i: number }
  | { t: 'clearMarks' }
  | { t: 'boundary'; k: number; lo: number; hi: number; show: boolean };
