interface VisibilityDocumentLike {
  visibilityState?: string
}

interface WindowLike {
  addEventListener: (eventName: string, listener: () => void) => void
  removeEventListener: (eventName: string, listener: () => void) => void
  document?: VisibilityDocumentLike
}

interface LifecyclePersistenceOptions {
  windowObject: WindowLike
  hasSavedRound: () => boolean
  persistRoundState: () => void
}

export function registerRoundLifecyclePersistence({
  windowObject,
  hasSavedRound,
  persistRoundState,
}: LifecyclePersistenceOptions): () => void {
  const persistWhenNeeded = () => {
    if (!hasSavedRound()) {
      return
    }
    persistRoundState()
  }

  const onVisibilityChange = () => {
    if (windowObject.document?.visibilityState === 'hidden') {
      persistWhenNeeded()
    }
  }

  windowObject.addEventListener('visibilitychange', onVisibilityChange)
  windowObject.addEventListener('pagehide', persistWhenNeeded)
  windowObject.addEventListener('beforeunload', persistWhenNeeded)

  return () => {
    windowObject.removeEventListener('visibilitychange', onVisibilityChange)
    windowObject.removeEventListener('pagehide', persistWhenNeeded)
    windowObject.removeEventListener('beforeunload', persistWhenNeeded)
  }
}
