import type { Storage, Stage, Status, Sort } from "@/types/domain";
import type { FiltersState } from "@/hooks/useFiltersState";

export const STORAGE_OPTIONS: Storage[] = ["counter", "fridge", "freezer"];
export const STAGE_OPTIONS: Stage[] = ["Fresh", "Eat Soon", "Last Call", "Spoiled"];
export const STATUS_OPTIONS: Status[] = ["ok", "spoiling", "expired"];
export const SORT_OPTIONS: Sort[] = ["days_left_asc", "days_left_desc", "recent", "az"];

export function toItemsQuery(state: FiltersState) {
  const { q, storage, stage, status, sort, page = 1, pageSize = 24 } = state;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  return { q, storage, stage, status, sort, from, to };
}
