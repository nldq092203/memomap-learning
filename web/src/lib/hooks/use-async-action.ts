"use client"

import { useCallback, useRef, useState } from "react"

type AsyncAction<TArgs extends unknown[], TResult> = (...args: TArgs) => Promise<TResult>

interface UseAsyncActionOptions {
  preventConcurrent?: boolean
}

export function useAsyncAction<TArgs extends unknown[], TResult>(
  action: AsyncAction<TArgs, TResult>,
  options: UseAsyncActionOptions = {},
) {
  const { preventConcurrent = true } = options
  const [isPending, setIsPending] = useState(false)
  const pendingRef = useRef<Promise<TResult> | null>(null)

  const run = useCallback(
    async (...args: TArgs): Promise<TResult> => {
      if (preventConcurrent && pendingRef.current) {
        return pendingRef.current
      }

      const promise = (async () => {
        setIsPending(true)
        try {
          return await action(...args)
        } finally {
          pendingRef.current = null
          setIsPending(false)
        }
      })()

      pendingRef.current = promise
      return promise
    },
    [action, preventConcurrent],
  )

  return {
    isPending,
    run,
  }
}
