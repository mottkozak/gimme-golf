export function dispatchWindowCustomEvent(eventName: string): void {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(new CustomEvent(eventName))
}
