#!/usr/bin/env bash
set -euo pipefail

ROOT="$(pwd)"
SRC="$ROOT/src"

echo "== ShelfLife stub bootstrap =="
echo "root: $ROOT"

mkdir -p "$SRC" "scripts"

# ---------- helpers ----------
has_named_export() {
  local file="$1" name="$2"
  [[ -f "$file" ]] && grep -Eq "export (function|const|class) ${name}\b|export \{[^}]*\b${name}\b" "$file"
}

append_or_create() {
  local file="$1" name="$2" kind="$3" # kind = hook|component|provider|page
  shift 3
  local body="$*"

  mkdir -p "$(dirname "$file")"

  if has_named_export "$file" "$name"; then
    echo "ok   : $name already exported in ${file#"$SRC/"}"
    return 0
  fi

  if [[ -f "$file" ]]; then
    echo -e "\n// auto-stub appended for $name\n$body" >> "$file"
    echo "append: $name → ${file#"$SRC/"}"
  else
    echo -e "// auto-stub created\n$body" > "$file"
    echo "create: ${file#"$SRC/"}"
  fi
}

# ---------- 1) domain types (authoritative) ----------
DOMAIN_FILE="$SRC/types/domain.ts"
if [[ ! -f "$DOMAIN_FILE" ]] || ! grep -q "export type Storage =" "$DOMAIN_FILE"; then
  mkdir -p "$(dirname "$DOMAIN_FILE")"
  cat > "$DOMAIN_FILE" <<'TS'
// auto-stub created
export type Storage = 'counter' | 'fridge' | 'freezer'
export type Stage = 'Fresh' | 'Eat Soon' | 'Last Call' | 'Spoiled'
export type Status = 'ok' | 'spoiling' | 'expired'
export type Sort = 'days_left_asc' | 'days_left_desc' | 'recent' | 'az'

export interface Item {
  id: string
  user_id: string
  name: string
  label: string
  store: string | null
  storage: Storage
  acquired_at: string
  image_path: string
  initial_days_left: number | null
  days_left: number | null
  freshness_score: number | null
  freshness_stage: Stage | null
  last_vlm_at: string | null
  updated_at: string | null
  status: Status
  created_at: string | null
  qty_type?: 'count' | 'weight' | 'volume'
  qty_unit?: string | null
  qty_value?: number | null
  qty_is_estimated?: boolean | null
}

export interface Counters {
  expiringToday: number
  thisWeek: number
  total: number
}
TS
  echo "create: types/domain.ts"
else
  echo "ok   : types/domain.ts"
fi

# ---------- 2) manifest of expected files (path|kind|exportName) ----------
# kind controls the default stub content
mapfile -t MANIFEST <<'EOF'
providers/QueryProvider.tsx|provider|QueryProvider
providers/AuthProvider.tsx|provider|AuthProvider
providers/ToastProvider.tsx|provider|ToastProvider
providers/DialogProvider.tsx|provider|DialogProvider
pages/DashboardPage.tsx|page|DashboardPage
pages/SettingsPage.tsx|page|SettingsPage
pages/SignInPage.tsx|page|SignInPage
pages/AuthCallbackPage.tsx|page|AuthCallbackPage
hooks/useItems.ts|hook|useItems
hooks/useAddItem.ts|hook|useAddItem
hooks/useUpdatePhoto.ts|hook|useUpdatePhoto
hooks/useFiltersState.ts|hook|useFiltersState
hooks/useDebounced.ts|hook|useDebounced
hooks/usePush.ts|hook|usePush
hooks/useInstallPrompt.ts|hook|useInstallPrompt
hooks/useAuthGuard.ts|hook|useAuthGuard
hooks/useCounters.ts|hook|useCounters
components/layout/TopBar.tsx|component|TopBar
components/layout/SideNav.tsx|component|SideNav
components/layout/InstallBanner.tsx|component|InstallBanner
components/layout/PushBanner.tsx|component|PushBanner
components/common/SearchBar.tsx|component|SearchBar
components/common/filters/StorageFilter.tsx|component|StorageFilter
components/common/filters/StageFilter.tsx|component|StageFilter
components/common/filters/StatusFilter.tsx|component|StatusFilter
components/common/SortDropdown.tsx|component|SortDropdown
components/common/StagePill.tsx|component|StagePill
components/common/StatusDot.tsx|component|StatusDot
components/common/StorageChip.tsx|component|StorageChip
components/common/DaysLeftBadge.tsx|component|DaysLeftBadge
components/common/IconButton.tsx|component|IconButton
components/common/SkeletonCard.tsx|component|SkeletonCard
components/common/EmptyState.tsx|component|EmptyState
components/common/ConfirmDialog.tsx|component|ConfirmDialog
components/common/Toast.tsx|component|Toast
components/common/NotificationBell.tsx|component|NotificationBell
components/common/QuantityBadge.tsx|component|QuantityBadge
components/common/QuantityAdjust.tsx|component|QuantityAdjust
components/dashboard/StatsStrip.tsx|component|StatsStrip
components/dashboard/CardGrid.tsx|component|CardGrid
components/dashboard/ProduceCard.tsx|component|ProduceCard
components/dashboard/AddEditItemSheet.tsx|component|AddEditItemSheet
components/dashboard/UpdatePhotoSheet.tsx|component|UpdatePhotoSheet
components/settings/AccountSection.tsx|component|AccountSection
components/settings/NotificationsSection.tsx|component|NotificationsSection
components/settings/DefaultsSection.tsx|component|DefaultsSection
components/settings/DataSection.tsx|component|DataSection
components/settings/PrivacySection.tsx|component|PrivacySection
EOF

# ---------- 3) template generators ----------
mk_provider() {
  local name="$1"
  if [[ "$name" == "QueryProvider" ]]; then
    cat <<'TS'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
const __client = new QueryClient()
export function QueryProvider({ children }: { children: React.ReactNode }) {
  return <QueryClientProvider client={__client}>{children}</QueryClientProvider>
}
TS
  else
    cat <<TS
export function ${name}({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
TS
  fi
}

mk_page() {
  local name="$1"
  cat <<TS
export function ${name}() {
  return <div className="p-6">${name}</div>
}
TS
}

mk_hook() {
  local name="$1"
  # Special-case useDebounced for convenience
  if [[ "$name" == "useDebounced" ]]; then
    cat <<'TS'
import { useEffect, useState } from 'react'
export function useDebounced<T>(value: T, delay = 300) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return v
}
TS
  elif [[ "$name" == "useItems" ]]; then
    cat <<'TS'
import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { listItems } from '@/services/items'
export type UseItemsParams  = Parameters<typeof listItems>[0]
export type UseItemsResult  = Awaited<ReturnType<typeof listItems>>
export function useItems(params: UseItemsParams) {
  return useQuery<UseItemsResult, Error>({
    queryKey: ['items', params],
    queryFn: () => listItems(params),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  })
}
TS
  else
    cat <<TS
export function ${name}(..._args: any[]) {
  // TODO: implement ${name}
  return {} as any
}
TS
  fi
}

mk_component() {
  local name="$1"
  case "$name" in
    SkeletonCard)
      cat <<'TS'
export function SkeletonCard(){
  return <div className="h-40 rounded bg-gray-100 animate-pulse" />
}
TS
    ;;
    EmptyState)
      cat <<'TS'
export function EmptyState({ title='Nothing here', cta }: { title?: string; cta?: React.ReactNode }){
  return <div className="text-center p-8 text-gray-500">{title}{cta && <div className="mt-3">{cta}</div>}</div>
}
TS
    ;;
    StagePill)
      cat <<'TS'
export function StagePill({ stage }: { stage: any }) {
  return <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{String(stage)}</span>
}
TS
    ;;
    StatusDot)
      cat <<'TS'
export function StatusDot({ status }: { status: any }) {
  return <span title={String(status)} className="inline-block w-2 h-2 rounded-full bg-gray-400" />
}
TS
    ;;
    StorageChip)
      cat <<'TS'
export function StorageChip({ storage }: { storage: any }) {
  return <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{String(storage)}</span>
}
TS
    ;;
    DaysLeftBadge)
      cat <<'TS'
export function DaysLeftBadge({ days }: { days?: number | null }) {
  const label = typeof days === 'number' ? (days <= 0 ? 'Expired' : `${days}d`) : '—'
  return <span className="text-xs px-2 py-0.5 rounded bg-gray-100">{label}</span>
}
TS
    ;;
    SideNav)
      cat <<'TS'
export function SideNav(){ return <nav className="p-4">SideNav</nav> }
TS
    ;;
    StatsStrip)
      cat <<'TS'
export function StatsStrip({ counters }: { counters?: any }){
  const c = counters ?? {}
  return <div className="text-sm text-gray-600">Expiring today: {c.expiringToday ?? 0} • This week: {c.thisWeek ?? 0} • Total: {c.total ?? 0}</div>
}
TS
    ;;
    *)
      cat <<TS
export function ${name}(props: any) {
  return <div data-stub="${name}"></div>
}
TS
    ;;
  esac
}

# ---------- 4) process manifest ----------
for entry in "${MANIFEST[@]}"; do
  IFS='|' read -r rel kind name <<<"$entry"
  file="$SRC/$rel"

  case "$kind" in
    provider) body="$(mk_provider "$name")" ;;
    page)     body="$(mk_page "$name")" ;;
    hook)     body="$(mk_hook "$name")" ;;
    component)body="$(mk_component "$name")" ;;
    *) echo "unknown kind: $kind ($rel)"; exit 1 ;;
  esac

  append_or_create "$file" "$name" "$kind" "$body"
done

echo "== done. now run: npm run dev (or rerun your audit script) =="
