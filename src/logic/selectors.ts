type SelectorArgs = readonly unknown[]

function areSameReferences(previousArgs: SelectorArgs, nextArgs: SelectorArgs): boolean {
  if (previousArgs.length !== nextArgs.length) {
    return false
  }

  return nextArgs.every((arg, index) => arg === previousArgs[index])
}

export interface RefMemoizedSelector<Args extends SelectorArgs, Result> {
  (...args: Args): Result
  clear: () => void
}

export function createRefMemoizedSelector<Args extends SelectorArgs, Result>(
  compute: (...args: Args) => Result,
): RefMemoizedSelector<Args, Result> {
  let cachedArgs: Args | null = null
  let cachedResult: Result | undefined
  let hasCachedResult = false

  const selector = (...args: Args): Result => {
    if (cachedArgs && hasCachedResult && areSameReferences(cachedArgs, args)) {
      return cachedResult as Result
    }

    const nextResult = compute(...args)
    cachedArgs = args
    cachedResult = nextResult
    hasCachedResult = true
    return nextResult
  }

  selector.clear = () => {
    cachedArgs = null
    cachedResult = undefined
    hasCachedResult = false
  }

  return selector
}
