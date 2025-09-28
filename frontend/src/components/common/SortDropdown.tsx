import type { Sort } from "@/types/domain";

const OPTIONS: { value: Sort; label: string }[] = [
  { value: "days_left_asc",  label: "Days left ↑" },
  { value: "days_left_desc", label: "Days left ↓" },
  { value: "recent",         label: "Recently added" },
  { value: "az",             label: "A → Z" },
];

type Props = {
  /** If omitted, defaults to 'recent' */
  value?: Sort;
  onChange: (s: Sort) => void;
};

export function SortDropdown({ value, onChange }: Props) {
  const current = value ?? "recent"; // default here

  return (
    <label className="inline-flex items-center gap-2 text-sm">
      <span className="text-neutral-600">Sort</span>
      <select
        className="border rounded-md px-2 py-1"
        value={current}
        onChange={(e) => onChange(e.target.value as Sort)}
      >
        {OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
