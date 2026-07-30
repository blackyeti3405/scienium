import { describe, expect, it } from 'vitest'
import { NEUTRALIZED_NAMES, neutralizeScope } from './neutralize'

const deny = (): never => {
  throw new Error('denied')
}

describe('neutralizeScope', () => {
  it('kills egress reached through the PROTOTYPE chain, not just the own prop', () => {
    // Mirror a worker global: fetch/importScripts live on
    // WorkerGlobalScope.prototype; constructors are own props on the global.
    const workerGlobalScopeProto: Record<string, unknown> = {
      fetch: () => 'LIVE',
      importScripts: () => 'LIVE',
    }
    const scopeProto = Object.create(workerGlobalScopeProto)
    const root = Object.create(scopeProto) as Record<string, unknown>
    root.Worker = function () {}
    root.WebSocket = function () {}

    neutralizeScope(root, deny)

    // Own-prop constructors are dead.
    expect(() => (root.Worker as () => void)()).toThrow('denied')
    expect(() => (root.WebSocket as () => void)()).toThrow('denied')
    // The prototype-reached fetch — self.constructor.prototype.fetch's cousin —
    // no longer yields a live function.
    const protoFetch = Object.getPrototypeOf(Object.getPrototypeOf(root)).fetch
    expect(protoFetch).toBe(deny)
    expect(() => protoFetch()).toThrow('denied')
    // And nothing in the chain returns 'LIVE' anymore.
    expect(() => (root.fetch as () => void)()).toThrow('denied')
    expect(() => (root.importScripts as () => void)()).toThrow('denied')
  })

  it('plants a throwing stub for names absent from the environment', () => {
    const root = {} as Record<string, unknown>
    neutralizeScope(root, deny)
    for (const name of NEUTRALIZED_NAMES) {
      expect(root[name], name).toBe(deny)
    }
  })

  it('makes stubs non-reconfigurable where the engine allows', () => {
    const root = {} as Record<string, unknown>
    neutralizeScope(root, deny)
    // A script trying to restore fetch must fail (property is non-configurable).
    expect(() =>
      Object.defineProperty(root, 'fetch', { value: () => 'restored' }),
    ).toThrow()
  })
})
