import { useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { SideNav } from '@/components/layout/SideNav'
import { StatsStrip } from '@/components/dashboard/StatsStrip'
import { CardGrid } from '@/components/dashboard/CardGrid'
import { AddEditItemSheet } from '@/components/dashboard/AddEditItemSheet'
import { UpdatePhotoSheet } from '@/components/dashboard/UpdatePhotoSheet'
import { useItems } from '@/hooks/useItems'
import { useFiltersState } from '@/hooks/useFiltersState'
import { useCounters } from '@/hooks/useCounters'
import { SignInOverlay } from '@/components/auth/SignInOverlay'

export function DashboardPage() {
  const filters = useFiltersState()
  const { data, isLoading, refetch } = useItems(filters.params)
  const { data: counters } = useCounters()

  const [addOpen, setAddOpen] = useState(false)
  const [updatePhotoFor, setUpdatePhotoFor] = useState<string|null>(null)

  return (
    <div className="flex h-screen relative">
      {/* Auth overlay */}
      <SignInOverlay />

      <SideNav />
      <div className="flex-1 flex flex-col">
        <TopBar filters={filters} onAdd={() => setAddOpen(true)} />
        <div className="p-4 space-y-4">
          <StatsStrip />
          <CardGrid
            items={data?.items ?? []}
            loading={isLoading}
            onUpdatePhoto={id => setUpdatePhotoFor(id)}
            onChanged={() => refetch()}
          />
        </div>
      </div>

      <AddEditItemSheet
        open={addOpen}
        onClose={(context) => {
          setAddOpen(false)
          if (context?.newItemId) setUpdatePhotoFor(context.newItemId)
        }}
      />

      <UpdatePhotoSheet
        itemId={updatePhotoFor}
        open={!!updatePhotoFor}
        onClose={(changed) => {
          setUpdatePhotoFor(null)
          if (changed) refetch()
        }}
      />
    </div>
  )
}
