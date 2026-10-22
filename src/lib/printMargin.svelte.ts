const STORAGE_KEY = 'printMarginMm';

export const MARGIN_PRESETS = [
  { label: '狭い', mm: 10 },
  { label: '標準', mm: 15 },
  { label: '広い', mm: 25 }
] as const;

export const MARGIN_MIN = 0;
export const MARGIN_MAX = 50;
const DEFAULT_MM = 15;

export function clampMargin(mm: number): number {
  return Number.isFinite(mm) ? Math.min(MARGIN_MAX, Math.max(MARGIN_MIN, Math.round(mm))) : DEFAULT_MM;
}

function load(): number {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === null ? DEFAULT_MM : clampMargin(Number(saved));
  } catch {
    return DEFAULT_MM;
  }
}

class PrintMargin {
  mm = $state(load());

  set(value: number) {
    this.mm = clampMargin(value);
    try {
      localStorage.setItem(STORAGE_KEY, String(this.mm));
    } catch {
      // 保存できなくても、このセッションでは設定を使える
    }
  }
}

export const printMargin = new PrintMargin();
