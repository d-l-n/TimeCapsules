import { vi } from 'vitest'

/**
 * Shared mock factory for firebase/firestore module.
 * Returns vi.fn() for each Firestore function with sensible defaults.
 *
 * Usage in test files:
 *   vi.mock('firebase/firestore', () => firestoreMock())
 *   vi.mock('../lib/firebase', () => ({ db: 'mock-db' }))
 *
 * Then access mocked functions:
 *   const firestore = await import('firebase/firestore')
 *   vi.mocked(firestore.getDocs).mockResolvedValueOnce(...)
 */
export function firestoreMock() {
  return {
    collection: vi.fn(() => 'mock-collection'),
    query: vi.fn(() => 'mock-query'),
    where: vi.fn(() => 'mock-where'),
    orderBy: vi.fn(() => 'mock-order'),
    limit: vi.fn(() => 'mock-limit'),
    getDocs: vi.fn(),
    addDoc: vi.fn(() => Promise.resolve({ id: 'mock-added-id' })),
    setDoc: vi.fn(() => Promise.resolve()),
    doc: vi.fn(() => 'mock-doc'),
    deleteDoc: vi.fn(() => Promise.resolve()),
    updateDoc: vi.fn(() => Promise.resolve()),
    increment: vi.fn((n: number) => n),
    arrayUnion: vi.fn((...args: unknown[]) => args),
    arrayRemove: vi.fn((...args: unknown[]) => args),
    onSnapshot: vi.fn(() => vi.fn()),
    getDoc: vi.fn(() => Promise.resolve({
      exists: () => false,
      data: () => null,
      id: 'mock-doc-id',
    })),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      commit: vi.fn(() => Promise.resolve()),
    })),
  }
}
