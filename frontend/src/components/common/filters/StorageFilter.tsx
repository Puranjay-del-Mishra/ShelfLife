import type { Storage } from '@/types/domain'

const OPTIONS: { value: Storage; label: string }[] = [
  { value: 'counter', label: 'Counter' },
  { value: 'fridge',  label: 'Fridge'  },
  { value: 'freezer', label: 'Freezer' },
]

type Props = {
  value?: Storage[];                     // <-- optional
  onChange: (next: Storage[]) => void;
};

export function StorageFilter({ value = [], onChange }: Props) { // <-- default to []
  const selected = value;

  function toggle(v: Storage) {
    const next = selected.includes(v)
      ? selected.filter(x => x !== v)
      : [...selected, v];
    onChange(next);
  }

  function clear() {
    onChange([]);
  }

  return (
    <div className="flex items-center gap-1" role="group" aria-label="Filter by storage">
      {OPTIONS.map(opt => {
        const active = selected.includes(opt.value);
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
        );
      })}
      {selected.length > 0 && (
        <button
          onClick={clear}
          className="ml-1 px-2 py-1 text-xs text-gray-600 hover:text-black"
          title="Clear storage filter"
          aria-label="Clear storage filter"
        >
          Clear
        </button>
      )}
    </div>
  );
}
