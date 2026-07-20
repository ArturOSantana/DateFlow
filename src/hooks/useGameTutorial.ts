import { useState, useCallback } from 'react'

const STORAGE_PREFIX = 'dateflow_tutorial_seen_'

export interface TutorialStep {
  title: string
  text: string
}

export function useGameTutorial(gameKey: string, steps: TutorialStep[]) {
  const storageKey = STORAGE_PREFIX + gameKey

  const [open, setOpen] = useState<boolean>(() => {
    try {
      return localStorage.getItem(storageKey) !== '1'
    } catch {
      return true
    }
  })

  const [stepIdx, setStepIdx] = useState(0)

  const close = useCallback(() => {
    try {
      localStorage.setItem(storageKey, '1')
    } catch {
      // ignore
    }
    setOpen(false)
    setStepIdx(0)
  }, [storageKey])

  const openTutorial = useCallback(() => {
    setStepIdx(0)
    setOpen(true)
  }, [])

  const next = useCallback(() => {
    setStepIdx(i => {
      if (i + 1 >= steps.length) return i
      return i + 1
    })
  }, [steps.length])

  const prev = useCallback(() => {
    setStepIdx(i => Math.max(0, i - 1))
  }, [])

  return { open, stepIdx, steps, close, openTutorial, next, prev }
}
