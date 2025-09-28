import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'

vi.mock('@/services/auth', () => ({ getUser: vi.fn().mockResolvedValue({ id: 'u1' }) }))
vi.mock('@/services/items', () => ({
  setItemImagePath: vi.fn().mockResolvedValue({}),
  uploadImage: vi.fn().mockResolvedValue({}),
  analyze: vi.fn().mockResolvedValue({}),
}))

import { useUpdatePhoto } from '../useUpdatePhoto'
import { setItemImagePath, uploadImage, analyze } from '@/services/items'

it('updates photo and analyzes', async () => {
  const { result } = renderHook(() => useUpdatePhoto('i1'))
  const blob = new Blob()
  await act(async () => { await result.current.update(blob) })
  expect(setItemImagePath).toHaveBeenCalledWith('i1', 'u1')
  expect(uploadImage).toHaveBeenCalled()
  expect(analyze).toHaveBeenCalledWith('i1')
})
