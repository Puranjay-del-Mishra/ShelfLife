import { useCallback } from 'react'
import { uploadImage, analyze, setItemImagePath } from '@/services/items'
import { getUser } from '@/services/auth'

export function useUpdatePhoto(itemId: string) {
  const update = useCallback(async (blob: Blob) => {
    const user = await getUser()
    await setItemImagePath(itemId, user.id)            // ensure path matches user/item
    await uploadImage(user.id, itemId, blob)           // upsert overwrite
    await analyze(itemId)                               // trigger VLM
  }, [itemId])

  return { update }
}
