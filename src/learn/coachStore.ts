import { create } from 'zustand'

/** Qué controles está señalando el guía (ids de `layout`, o `key-N`). */
interface CoachState {
  targets: string[]
  setTarget: (t: string | string[] | null) => void
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i])

export const useCoach = create<CoachState>((set) => ({
  targets: [],
  setTarget: (t) => {
    const targets = t == null ? [] : Array.isArray(t) ? t : [t]
    set((s) => (same(s.targets, targets) ? s : { targets }))
  },
}))
