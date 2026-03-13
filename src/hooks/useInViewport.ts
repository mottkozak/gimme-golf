import { useCallback, useEffect, useRef, useState } from 'react'

interface UseInViewportOptions {
  once?: boolean
  rootMargin?: string
  threshold?: number
}

type ViewportRefSetter<T extends HTMLElement> = (element: T | null) => void

function useInViewport<T extends HTMLElement = HTMLElement>(
  options: UseInViewportOptions = {},
): [ViewportRefSetter<T>, boolean] {
  const {
    once = false,
    rootMargin = '0px 0px -10% 0px',
    threshold = 0.2,
  } = options
  const [isInViewport, setIsInViewport] = useState(false)
  const observerRef = useRef<IntersectionObserver | null>(null)

  const disconnectObserver = useCallback(() => {
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }
  }, [])

  const setObservedElement = useCallback<ViewportRefSetter<T>>(
    (element) => {
      disconnectObserver()

      if (!element) {
        return
      }

      if (typeof window === 'undefined' || typeof IntersectionObserver !== 'function') {
        setIsInViewport(true)
        return
      }

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (!entry) {
            return
          }

          if (entry.isIntersecting) {
            setIsInViewport(true)
            if (once) {
              disconnectObserver()
            }
            return
          }

          if (!once) {
            setIsInViewport(false)
          }
        },
        {
          root: null,
          rootMargin,
          threshold,
        },
      )

      observerRef.current.observe(element)
    },
    [disconnectObserver, once, rootMargin, threshold],
  )

  useEffect(
    () => () => {
      disconnectObserver()
    },
    [disconnectObserver],
  )

  return [setObservedElement, isInViewport]
}

export default useInViewport
