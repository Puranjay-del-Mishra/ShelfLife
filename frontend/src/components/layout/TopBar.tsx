// src/components/layout/TopBar.tsx
import { useState, useRef, useEffect } from "react";
import { SearchBar } from "@/components/common/SearchBar";
import { StorageFilter } from "@/components/common/filters/StorageFilter";
import { StageFilter } from "@/components/common/filters/StageFilter";
import { StatusFilter } from "@/components/common/filters/StatusFilter";
import { SortDropdown } from "@/components/common/SortDropdown";
import { NotificationBell } from "@/components/common/NotificationBell";
import { SignOutButton } from "@/components/common/SignOutButton";
import type { Sort, Stage, Status, Storage } from "@/types/domain";

type FiltersProps = {
  q?: string;
  storage?: Storage[];
  stage?: Stage[];
  status?: Status[];
  sort?: Sort;
  setQ: (v: string) => void;
  setStorage: (next: Storage[]) => void;
  setStage: (next: Stage[]) => void;
  setStatus: (next: Status[]) => void;
  setSort: (next: Sort) => void;
};

export function TopBar({
  filters,
  onAdd,
}: {
  filters: FiltersProps;
  onAdd: () => void;
}) {
  // safe fallbacks so children never receive undefined
  const q = filters.q ?? "";
  const storage = filters.storage ?? [];
  const stage = filters.stage ?? [];
  const status = filters.status ?? [];
  const sort = filters.sort; // SortDropdown can handle undefined with its default

  // Compact dropdown for filters
  const [open, setOpen] = useState(false);
  const pop = useRef<HTMLDivElement | null>(null);

  // click outside to close
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!pop.current) return;
      if (!pop.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  return (
    <div className="sticky top-0 z-20 border-b bg-white">
      <div className="flex items-center gap-3 p-3">
        {/* Brand */}
        <div className="text-xl font-semibold mr-2 select-none">🥬 ShelfLife</div>

        {/* Search */}
        <SearchBar value={q} onChange={filters.setQ} />

        {/* Sort kept inline (compact) */}
        <div className="hidden sm:flex items-center">
          <div className="ml-2">
            <SortDropdown value={sort} onChange={filters.setSort} />
          </div>
        </div>

        {/* Filters menu (Storage / Stage / Status) */}
        <div className="relative ml-1" ref={pop}>
          <button
            className="px-3 py-1.5 rounded-xl border hover:bg-gray-50"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-haspopup="menu"
          >
            Filters
          </button>
          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-[min(92vw,720px)] rounded-xl border bg-white shadow-lg p-3"
            >
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-neutral-600">Storage</div>
                  <StorageFilter value={storage} onChange={filters.setStorage} />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-neutral-600">Stage</div>
                  <StageFilter value={stage} onChange={filters.setStage} />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-medium text-neutral-600">Status</div>
                  <StatusFilter value={status} onChange={filters.setStatus} />
                </div>
              </div>

              {/* Optional: move Sort here instead of inline */}
              {/* <div className="mt-3">
                <SortDropdown value={sort} onChange={filters.setSort} />
              </div> */}

              <div className="mt-3 flex justify-end">
                <button
                  className="px-3 py-1.5 rounded-xl border hover:bg-gray-50"
                  onClick={() => setOpen(false)}
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-2">
          <NotificationBell />
          <button
            className="px-3 py-1.5 rounded-xl bg-black text-white"
            onClick={onAdd}
          >
            + Add Produce
          </button>
          <SignOutButton />
        </div>
      </div>
    </div>
  );
}
