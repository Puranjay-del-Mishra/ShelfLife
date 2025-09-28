import { useState } from 'react'
import { TopBar } from '@/components/layout/TopBar'
import { SideNav } from '@/components/layout/SideNav'
import { StatsStrip } from '@/components/dashboard/StatsStrip'
import { CardGrid } from '@/components/dashboard/CardGrid'
import { UpdatePhotoSheet } from '@/components/dashboard/UpdatePhotoSheet'
import { AddProduceFlow } from '@/components/dashboard/AddProduceFlow'
import { useItems } from '@/hooks/useItems'
import { useFiltersState } from '@/hooks/useFiltersState'
import type { Storage, Stage, Status, Sort } from '@/types/domain'

export function DashboardPage() {
  const f = useFiltersState()

  // Shape what TopBar expects
  const topBarFilters: React.ComponentProps<typeof TopBar>['filters'] = {
    q: f.state.q,
    storage: f.state.storage,
    stage: f.state.stage,
    status: f.state.status,
    // keep your default sort name consistent with your Sort type
    sort: (f.state.sort ?? 'recent') as Sort,

    setQ: (v: string) => f.setState({ q: v, page: 1 }),
    setStorage: (next: Storage[]) => f.setState({ storage: next, page: 1 }),
    setStage: (next: Stage[]) => f.setState({ stage: next, page: 1 }),
    setStatus: (next: Status[]) => f.setState({ status: next, page: 1 }),
    setSort: (next: Sort) => f.setState({ sort: next, page: 1 }),
  }

  // Data
  const { data, isLoading, refetch } = useItems({
    ...f.state,
    pageSize: 24,
  })

  // Camera + update-photo modals
  const [captureOpen, setCaptureOpen] = useState(false)
  const [updatePhotoFor, setUpdatePhotoFor] = useState<string | null>(null)

  return (
    <div className="flex h-screen relative">
      <SideNav />

      <div className="flex-1 flex flex-col">
        <TopBar
          filters={topBarFilters}
          onAdd={() => setCaptureOpen(true)}
        />

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

      {/* New full-screen capture flow */}
      <AddProduceFlow
        open={captureOpen}
        onClose={() => setCaptureOpen(false)}
        onChanged={() => refetch()}
      />

      {/* Keep photo update sheet if you still use it elsewhere */}
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
