import { describe, it, expect, beforeEach } from 'vitest'
import {
  pushModal,
  popModal,
  isTopModal,
  __resetModalStack,
} from '@/components/ui/useModalA11y'

/**
 * The modal stack behind `useModalA11y` (§0.9 Row A).
 *
 * The ATTACK: two dialogs are open at once — a FeaturePanel and the
 * `useConfirm()` delete dialog opened from inside it. Both register a `keydown`
 * listener on `document`, so a single Escape used to run BOTH `onClose`
 * callbacks and the student lost the whole feature panel along with the
 * confirm. `stopPropagation` cannot stop that: it does not affect sibling
 * listeners on the same node.
 *
 * These tests pin the ordering rule the DOM does not carry — exactly ONE open
 * dialog is "top", it is the one registered LAST, and it goes back to the
 * previous one when the inner dialog unmounts. Escape handling in the hook is a
 * single `if (!isTopModal(token)) return`, so this is the guard, not a restated
 * fix. DOM-level proof that one Escape leaves the parent panel open is
 * `e2e/F3.spec.ts` AC5.
 */
describe('modal stack', () => {
  beforeEach(() => __resetModalStack())

  it('a lone dialog is top', () => {
    const a = Symbol('a')
    pushModal(a)
    expect(isTopModal(a)).toBe(true)
  })

  it('a nested dialog takes the top and the parent stops handling keys', () => {
    const panel = Symbol('panel')
    const confirm = Symbol('confirm')
    pushModal(panel)
    pushModal(confirm)

    // The exact failure being pinned: with both open, only ONE of them may act
    // on an Escape.
    expect([isTopModal(panel), isTopModal(confirm)]).toEqual([false, true])
  })

  it('closing the inner dialog hands the top back to the parent', () => {
    const panel = Symbol('panel')
    const confirm = Symbol('confirm')
    pushModal(panel)
    pushModal(confirm)
    popModal(confirm)

    expect(isTopModal(panel)).toBe(true)
    // A second Escape now closes the panel — the flow still works, it just
    // takes two keys instead of collapsing everything on one.
    popModal(panel)
    expect(isTopModal(panel)).toBe(false)
  })

  it('an out-of-order unmount removes the right entry, not the top', () => {
    // React does not guarantee sibling cleanup order, and `useConfirm`'s dialog
    // can unmount after its host panel when a route change tears both down.
    const panel = Symbol('panel')
    const confirm = Symbol('confirm')
    pushModal(panel)
    pushModal(confirm)
    popModal(panel)

    expect(isTopModal(confirm)).toBe(true)
    expect(isTopModal(panel)).toBe(false)
  })

  it('nothing is top when the stack is empty', () => {
    const gone = Symbol('gone')
    pushModal(gone)
    popModal(gone)
    expect(isTopModal(gone)).toBe(false)
  })

  it('popping an unregistered token leaves the stack alone', () => {
    // StrictMode double-invokes effects; a stray cleanup must not evict a live
    // dialog and silently disable its Escape.
    const live = Symbol('live')
    pushModal(live)
    popModal(Symbol('never-pushed'))
    expect(isTopModal(live)).toBe(true)
  })
})
