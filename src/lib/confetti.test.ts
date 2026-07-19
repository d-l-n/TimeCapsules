import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { triggerConfetti } from './confetti'

function makeCanvas() {
  return {
    style: { cssText: '' },
    width: 0,
    height: 0,
    getContext: vi.fn().mockReturnValue({
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      translate: vi.fn(),
      rotate: vi.fn(),
      fillRect: vi.fn(),
      globalAlpha: 1,
      fillStyle: '',
    }),
    remove: vi.fn(),
  }
}

describe('confetti', () => {
  let appendChildSpy: ReturnType<typeof vi.fn>
  let createElementSpy: ReturnType<typeof vi.fn>
  let cancelAnimationFrameSpy: ReturnType<typeof vi.fn>
  let requestAnimationFrameSpy: ReturnType<typeof vi.fn>
  let mockCanvas: ReturnType<typeof makeCanvas>

  beforeEach(() => {
    mockCanvas = makeCanvas()
    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as unknown as HTMLElement)
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockReturnValue(mockCanvas as unknown as Node)
    cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})
    requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(1)

    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 720, writable: true, configurable: true })

    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList)

    vi.spyOn(document, 'querySelector').mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('creates a canvas and appends it to body', () => {
    triggerConfetti()
    expect(createElementSpy).toHaveBeenCalledWith('canvas')
    expect(appendChildSpy).toHaveBeenCalledWith(mockCanvas)
  })

  it('requests an animation frame', () => {
    triggerConfetti()
    expect(requestAnimationFrameSpy).toHaveBeenCalledOnce()
  })

  it('sets canvas size to window dimensions', () => {
    triggerConfetti()
    expect(mockCanvas.width).toBe(1280)
    expect(mockCanvas.height).toBe(720)
  })

  it('does nothing when prefers-reduced-motion is set', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
    } as MediaQueryList)

    triggerConfetti()
    expect(createElementSpy).not.toHaveBeenCalled()
    expect(requestAnimationFrameSpy).not.toHaveBeenCalled()
  })

  it('does nothing when data-reduce-effects element exists', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList)
    const fakeEl = { nodeType: 1 } as unknown as Element
    vi.spyOn(document, 'querySelector').mockReturnValue(fakeEl)

    triggerConfetti()
    expect(appendChildSpy).not.toHaveBeenCalled()
    expect(requestAnimationFrameSpy).not.toHaveBeenCalled()
  })

  it('removes canvas and cancels raf when context is unavailable', () => {
    mockCanvas.getContext.mockReturnValue(null)
    triggerConfetti()
    expect(mockCanvas.remove).toHaveBeenCalledOnce()
    expect(requestAnimationFrameSpy).not.toHaveBeenCalled()
  })

  it('cancels any existing animation frame before starting a new one', () => {
    requestAnimationFrameSpy.mockReturnValue(42)
    triggerConfetti()
    triggerConfetti()
    expect(cancelAnimationFrameSpy).toHaveBeenCalledWith(42)
  })
})
