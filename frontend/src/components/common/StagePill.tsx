import type { Stage } from '@/types/domain'

export function StagePill({ stage }: { stage: Stage }) {
  const cls =
    stage === 'Fresh'     ? 'bg-green-100 text-green-700'   :
    stage === 'Eat Soon'  ? 'bg-yellow-100 text-yellow-700' :
    stage === 'Last Call' ? 'bg-orange-100 text-orange-700' :
                            'bg-red-100 text-red-700'
  return <span className={`text-xs px-2 py-0.5 rounded ${cls}`}>{stage}</span>
}
