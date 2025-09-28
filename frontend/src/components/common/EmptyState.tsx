import * as React from 'react'

type Props = {
  icon?: React.ReactNode
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ icon, title, subtitle, actionLabel, onAction }: Props) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-14 px-6 border border-dashed rounded-2xl bg-white">
      <div className="mb-3">{icon ?? <span className="text-3xl">🥕</span>}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      {actionLabel && (
        <button
          onClick={onAction}
          className="mt-4 px-3 py-1.5 rounded-md bg-black text-white hover:opacity-90"
        >
          {actionLabel}
        </button>
      )}
    </div>
  )
}
