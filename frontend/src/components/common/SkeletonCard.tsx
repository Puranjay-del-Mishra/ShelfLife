export function SkeletonCard() {
  return (
    <div className="rounded-xl border bg-white p-3 animate-pulse">
      <div className="aspect-square w-full rounded-lg bg-gray-100" />
      <div className="mt-3 h-4 w-2/3 rounded bg-gray-100" />
      <div className="mt-2 flex items-center gap-2">
        <div className="h-3 w-16 rounded bg-gray-100" />
        <div className="h-3 w-10 rounded bg-gray-100" />
      </div>
      <div className="mt-3 h-6 w-20 rounded bg-gray-100" />
      <div className="mt-3 flex justify-end gap-2">
        <div className="h-8 w-8 rounded bg-gray-100" />
        <div className="h-8 w-8 rounded bg-gray-100" />
        <div className="h-8 w-8 rounded bg-gray-100" />
      </div>
    </div>
  )
}
