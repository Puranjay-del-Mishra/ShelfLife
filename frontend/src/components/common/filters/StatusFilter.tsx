import type { Status } from '@/types/domain'

const OPTIONS: { value: Status; label: string }[] = [
  { value: 'ok',       label: 'OK' },
  { value: 'spoiling', label: 'Spoiling' },
  { value: 'expired',  label: 'Expired' },
]

type Props = { value?: Status[]; onChange: (next: Status[]) => void }

export function StatusFilter({ value = [], onChange }: Props) {
  const selected = value
  const toggle = (v: Status) =>
    onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])
  const clear = () => onChange([])

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Filter by status">
      {OPTIONS.map(opt => {
        const active = selected.includes(opt.value)
        return (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={[
              'px-2 py-1 rounded-full text-sm border',
              active ? 'bg-black text-white border-black' : 'bg-white hover:bg-gray-50'
            ].join(' ')}
            aria-pressed={active}
          >
            {opt.label}
          </button>
        )
      })}
      {selected.length > 0 && (
        <button
          onClick={clear}
          className="ml-1 px-2 py-1 text-xs text-gray-600 hover:text-black"
          title="Clear status filter"
          aria-label="Clear status filter"
        >
          Clear
        </button>
      )}
    </div>
  )
}
