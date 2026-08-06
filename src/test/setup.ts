/// <reference types="vitest" />
import '@testing-library/jest-dom'
import { toHaveNoViolations } from 'jest-axe'

expect.extend(toHaveNoViolations)

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

// jsdom doesn't implement window/element scrolling — no-op for tests
Object.defineProperty(window, 'scrollTo', { writable: true, value: () => {} })
Object.defineProperty(window, 'scrollBy', { writable: true, value: () => {} })
if (!window.Element.prototype.scrollTo) {
  Object.defineProperty(window.Element.prototype, 'scrollTo', { writable: true, value: () => {} })
}
if (!window.Element.prototype.scrollIntoView) {
  Object.defineProperty(window.Element.prototype, 'scrollIntoView', { writable: true, value: () => {} })
}

class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = MockResizeObserver

if ('HTMLDialogElement' in window) {
  const proto = window.HTMLDialogElement.prototype
  if (!proto.showModal) {
    proto.showModal = function (this: HTMLDialogElement) {
      this.open = true
      if (!this.dataset.dialogPolyfilled) {
        this.dataset.dialogPolyfilled = '1'
        this.addEventListener('click', (e) => {
          if (e.target === this) this.close()
        })
      }
    }
  }
  if (!proto.close) proto.close = function (this: HTMLDialogElement) {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}

