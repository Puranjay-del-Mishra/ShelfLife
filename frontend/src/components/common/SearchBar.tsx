import { useRef } from 'react'

export function SearchBar({
  value,
  onChange,
  placeholder = 'Search produce or store…',
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex items-center gap-2 min-w-[220px] md:min-w-[340px]">
      <div className="flex items-center gap-2 flex-1 rounded-xl border px-3 py-1.5 bg-white">
        <span aria-hidden>🔎</span>
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full outline-none text-sm"
          aria-label="Search by name or store"
        />
        {value && (
          <button
            className="text-gray-500 hover:text-black text-sm"
            onClick={() => {
              onChange('')
              inputRef.current?.focus()
            }}
            aria-label="Clear search"
            title="Clear"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
