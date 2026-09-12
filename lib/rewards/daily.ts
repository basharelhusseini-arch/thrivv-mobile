
export const formatRewardPoints = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value)
    ? new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(value) : '—';

export function dailyRewardStatus(enabled: boolean, activation: string | null, date: string, score: number | null, complete: boolean, credited: number | null) {
  if (credited !== null) return { status: 'credited', amount: credited };
  if (!enabled || !activation || date < activation) return { status: 'disabled', amount: null };
  return { status: complete ? 'estimated' : 'pending', amount: complete ? score : null };
}

