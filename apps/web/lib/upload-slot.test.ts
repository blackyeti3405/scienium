import { describe, it, expect } from 'vitest'
import { createUploadSlot } from './upload-slot'

/**
 * REFACTOR2 P2-2 — the upload mutation-identity machine. Every case here is a
 * completion that lands after the student has moved on; the slot decides
 * whether it is still allowed to write.
 */
describe('upload slot', () => {
  it('a completion applies while its attempt still owns the slot', () => {
    const slot = createUploadSlot()
    const { token } = slot.begin()
    expect(slot.owns(token)).toBe(true)
    expect(slot.pending()).toBe(true)
  })

  it('removal during an upload is not undone by the completion', () => {
    // Models AttachmentUploader's completion path. Removing an already-uploaded
    // photo is a list edit, not a reason to throw away bytes the student asked
    // to send: the attempt keeps the slot, and the append is a FUNCTIONAL
    // update, so it lands on the post-removal list instead of re-adding 'a'.
    const slot = createUploadSlot()
    let urls = ['a', 'b']
    const { token, signal } = slot.begin() // upload of 'c' starts
    urls = urls.filter((u) => u !== 'a') // student removes 'a' mid-flight
    expect(slot.owns(token)).toBe(true)
    expect(signal.aborted).toBe(false)
    if (slot.owns(token)) urls = [...urls, 'c']
    expect(urls).toEqual(['b', 'c'])
  })

  it('a completion landing after unmount writes nothing', () => {
    const slot = createUploadSlot()
    let urls = ['a']
    const { token } = slot.begin()
    slot.cancel() // form unmounted while the bytes were still going out
    if (slot.owns(token)) urls = [...urls, 'c']
    expect(urls).toEqual(['a'])
  })

  it('unmount aborts the request and disowns the completion still coming', () => {
    const slot = createUploadSlot()
    const { token, signal } = slot.begin()
    slot.cancel() // what useUploadSlot's unmount cleanup does
    expect(signal.aborted).toBe(true)
    expect(slot.owns(token)).toBe(false)
    expect(slot.pending()).toBe(false)
  })

  it('a stale completion cannot write after the slot was cancelled and re-used', () => {
    const slot = createUploadSlot()
    const stale = slot.begin()
    slot.cancel()
    const fresh = slot.begin()
    expect(slot.owns(stale.token)).toBe(false)
    expect(slot.owns(fresh.token)).toBe(true)
  })

  it('a second attempt supersedes and aborts the first', () => {
    const slot = createUploadSlot()
    const first = slot.begin()
    const second = slot.begin()
    expect(first.signal.aborted).toBe(true)
    expect(slot.owns(first.token)).toBe(false)
    expect(second.signal.aborted).toBe(false)
    expect(slot.owns(second.token)).toBe(true)
  })

  it('a superseded attempt settling does not clear the live one', () => {
    const slot = createUploadSlot()
    const first = slot.begin()
    const second = slot.begin()
    slot.settle(first.token) // the loser's `finally` runs late
    expect(slot.pending()).toBe(true)
    expect(slot.owns(second.token)).toBe(true)
    slot.settle(second.token)
    expect(slot.pending()).toBe(false)
  })

  it('retry after a failed attempt gets a live signal and a fresh identity', () => {
    const slot = createUploadSlot()
    const failed = slot.begin()
    slot.settle(failed.token)
    expect(slot.pending()).toBe(false)
    const retry = slot.begin()
    expect(retry.token).not.toBe(failed.token)
    expect(retry.signal.aborted).toBe(false)
    expect(slot.owns(retry.token)).toBe(true)
  })

  it('cancelling an idle slot is a no-op that still disowns the last attempt', () => {
    const slot = createUploadSlot()
    const { token } = slot.begin()
    slot.settle(token)
    slot.cancel()
    expect(slot.pending()).toBe(false)
    expect(slot.owns(token)).toBe(false)
  })
})
