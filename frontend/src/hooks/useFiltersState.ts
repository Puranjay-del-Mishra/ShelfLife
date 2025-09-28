import { useMemo, useCallback } from "react";
import { useSearchParams, useNavigate, useLocation } from "react-router-dom";
import type { Storage, Stage, Status, Sort } from "@/types/domain";

export type FiltersState = {
  q?: string;
  storage?: Storage[];
  stage?: Stage[];
  status?: Status[];
  sort?: Sort;
  page?: number;
  pageSize?: number; // optional, not stored in URL
};

function splitMulti(v: string | null): string[] {
  if (!v) return [];
  return v.split(",").map(s => s.trim()).filter(Boolean);
}
function joinMulti(arr?: (string | number)[]): string | null {
  if (!arr || arr.length === 0) return null;
  return arr.join(",");
}

export function useFiltersState() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const state: FiltersState = useMemo(() => {
    const q = params.get("q") || undefined;
    const storage = splitMulti(params.get("storage")) as Storage[];
    const stage = splitMulti(params.get("stage")) as Stage[];
    const status = splitMulti(params.get("status")) as Status[];
    const sort = (params.get("sort") || undefined) as Sort | undefined;
    const pageStr = params.get("page");
    const page = pageStr ? Math.max(1, Number(pageStr)) : undefined;

    return {
      q,
      storage: storage.length ? storage : undefined,
      stage: stage.length ? stage : undefined,
      status: status.length ? status : undefined,
      sort,
      page,
      // pageSize stays out of URL (set where you call useItems)
    };
  }, [params]);

  const setState = useCallback((next: Partial<FiltersState> | ((prev: FiltersState) => Partial<FiltersState>)) => {
    const prev = state;
    const patch = typeof next === "function" ? (next as any)(prev) : next;
    const merged: FiltersState = { ...prev, ...patch };

    const nextParams = new URLSearchParams();

    if (merged.q) nextParams.set("q", merged.q);
    const storage = joinMulti(merged.storage);
    if (storage) nextParams.set("storage", storage);
    const stage = joinMulti(merged.stage);
    if (stage) nextParams.set("stage", stage);
    const status = joinMulti(merged.status);
    if (status) nextParams.set("status", status);
    if (merged.sort) nextParams.set("sort", merged.sort);
    if (merged.page && merged.page > 1) nextParams.set("page", String(merged.page));

    navigate({ pathname: location.pathname, search: `?${nextParams.toString()}` }, { replace: false });
  }, [state, navigate, location.pathname]);

  const reset = useCallback(() => {
    navigate({ pathname: location.pathname }, { replace: false });
  }, [navigate, location.pathname]);

  return { state, setState, reset };
}
