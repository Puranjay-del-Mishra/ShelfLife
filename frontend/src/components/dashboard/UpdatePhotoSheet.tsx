import { useEffect, useState } from 'react'
import { useUpdatePhoto } from '@/hooks/useUpdatePhoto'
import { fileToWebP } from '@/services/image'

export function UpdatePhotoSheet({ itemId, open, onClose }:{
  itemId: string | null
  open: boolean
  onClose: (changed: boolean) => void
}) {
  const { update } = useUpdatePhoto(itemId || '')
  const [file, setFile] = useState<File|null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => { setFile(null) }, [open])

  if (!open || !itemId) return null

  return (
    <div className="fixed inset-0 bg-black/30 flex justify-center items-end md:items-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl p-4 space-y-3">
        <div className="text-lg font-semibold">Update Photo</div>
        <input type="file" accept="image/*" capture="environment" onChange={e=>setFile(e.target.files?.[0] ?? null)} />

        <div className="flex justify-end gap-2">
          <button className="px-3 py-1.5" onClick={()=>onClose(false)}>Cancel</button>
          <button className="px-3 py-1.5 rounded bg-black text-white" disabled={!file || busy}
            onClick={async ()=>{
              setBusy(true)
              const blob = await fileToWebP(file!, 512, 0.8)
              await update(blob) // upload+analyze+realtime flip
              setBusy(false)
              onClose(true)
            }}>Save</button>
        </div>
      </div>
    </div>
  )
}
