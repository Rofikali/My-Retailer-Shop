export function useScrollIntoView() {
  const scrollIntoView = (element: HTMLElement | null, behavior: ScrollBehavior = 'smooth') => {
    if (!element || typeof window === 'undefined') return

    element.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : behavior,
      block: 'nearest',
      inline: 'nearest'
    })
  }

  return { scrollIntoView }
}
