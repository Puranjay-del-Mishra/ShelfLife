export function DaysLeftBadge({ days }: { days?: number | null }) {
  // shows "Expired" for <= 0, "<n>d" otherwise, "—" if unknown
  const label =
    typeof days === 'number'
      ? (days <= 0 ? 'Expired' : `${days}d`)
      : '—'
  return <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{label}</span>
}
