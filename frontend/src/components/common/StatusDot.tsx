import type { Status } from '@/types/domain'

export function StatusDot({ status }: { status: Status }) {
  const cls =
    status === 'ok'       ? 'bg-green-500'  :
    status === 'spoiling' ? 'bg-orange-500' :
                            'bg-red-500'
  return <span title={status} className={`inline-block w-2 h-2 rounded-full ${cls}`} />
}
