import { ProduceCard } from './ProduceCard'
import { SkeletonCard } from '@/components/common/SkeletonCard'
import { EmptyState } from '@/components/common/EmptyState'
import type { Item } from '@/types/domain'

export function CardGrid({ items, loading, onUpdatePhoto, onChanged }:{
  items: Item[]
  loading: boolean
  onUpdatePhoto: (id: string) => void
  onChanged: () => void
}) {
  if (loading) return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {Array.from({length: 8}).map((_,i)=><SkeletonCard key={i} />)}
    </div>
  )
  if (!items.length) return <EmptyState title="No items yet" subtitle="Snap your first item to start tracking!" />

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map(it => (
        <ProduceCard key={it.id} item={it} onUpdatePhoto={onUpdatePhoto} onChanged={onChanged}/>
      ))}
    </div>
  )
}
