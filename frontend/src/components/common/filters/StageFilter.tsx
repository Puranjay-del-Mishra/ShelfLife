import type { Stage } from '@/types/domain'

const OPTIONS: { value: Stage; label: string }[] = [
  { value: 'Fresh',     label: 'Fresh' },
  { value: 'Eat Soon',  label: 'Eat Soon' },
  { value: 'Last Call', label: 'Last Call' },
  { value: 'Spoiled',   label: 'Spoiled' },
]

type Props = {
  value?: Stage[]               // <- optional
  onChange: (next: Stage[]) => void
}

export function StageFilter({ value = [], onChange }: Props) { // <- default to []
  const selected = value

  function toggle(v: Stage) {
    const next = selected.includes(v)
      ? selected.filter(x => x !== v)
      : [...selected, v]
    onChange(next)
  }
  function clear() { onChange([]) }

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Filter by stage">
      {OPTIONS.map(opt => {
        const active = selected.includes(opt.value)
        const pillClass =
          opt.value === 'Fresh'      ? 'bg-emerald-500' :
          opt.value === 'Eat Soon'   ? 'bg-amber-500'  :
          opt.value === 'Last Call'  ? 'bg-orange-500' :
                                       'bg-red-500'
        return (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className={[
              'px-2 py-1 rounded-full text-sm border',
              active ? `${pillClass} text-white border-transparent` : 'bg-white hover:bg-gray-50'
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
          title="Clear stage filter"
          aria-label="Clear stage filter"
        >
          Clear
        </button>
      )}
    </div>
  )
}
