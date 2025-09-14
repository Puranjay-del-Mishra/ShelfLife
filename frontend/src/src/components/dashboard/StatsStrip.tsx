// auto-stub created
export function StatsStrip({ counters }: { counters?: any }){
  const c = counters ?? {}
  return <div className="text-sm text-gray-600">Expiring today: {c.expiringToday ?? 0} • This week: {c.thisWeek ?? 0} • Total: {c.total ?? 0}</div>
}
