// Los 32 algoritmos de 6 operadores (los mismos del DX7, que el FM-1 usa).
// carriers: operadores que suenan · mods: [modulador, destino] · fb: [op que
// recibe la retroalimentación, op de donde sale] (iguales = auto-feedback).

export interface Algorithm {
  carriers: number[]
  mods: [number, number][]
  fb: [number, number]
}

const A = (carriers: number[], mods: [number, number][], fb: [number, number]): Algorithm => ({ carriers, mods, fb })

export const ALGORITHMS: Algorithm[] = [
  A([1, 3], [[2, 1], [4, 3], [5, 4], [6, 5]], [6, 6]), // 1
  A([1, 3], [[2, 1], [4, 3], [5, 4], [6, 5]], [2, 2]), // 2
  A([1, 4], [[2, 1], [3, 2], [5, 4], [6, 5]], [6, 6]), // 3
  A([1, 4], [[2, 1], [3, 2], [5, 4], [6, 5]], [6, 4]), // 4
  A([1, 3, 5], [[2, 1], [4, 3], [6, 5]], [6, 6]), // 5
  A([1, 3, 5], [[2, 1], [4, 3], [6, 5]], [6, 5]), // 6
  A([1, 3], [[2, 1], [4, 3], [5, 3], [6, 5]], [6, 6]), // 7
  A([1, 3], [[2, 1], [4, 3], [5, 3], [6, 5]], [4, 4]), // 8
  A([1, 3], [[2, 1], [4, 3], [5, 3], [6, 5]], [2, 2]), // 9
  A([1, 4], [[2, 1], [3, 2], [5, 4], [6, 4]], [3, 3]), // 10
  A([1, 4], [[2, 1], [3, 2], [5, 4], [6, 4]], [6, 6]), // 11
  A([1, 3], [[2, 1], [4, 3], [5, 3], [6, 3]], [2, 2]), // 12
  A([1, 3], [[2, 1], [4, 3], [5, 3], [6, 3]], [6, 6]), // 13
  A([1, 3], [[2, 1], [4, 3], [5, 4], [6, 4]], [6, 6]), // 14
  A([1, 3], [[2, 1], [4, 3], [5, 4], [6, 4]], [2, 2]), // 15
  A([1], [[2, 1], [3, 1], [4, 3], [5, 1], [6, 5]], [6, 6]), // 16
  A([1], [[2, 1], [3, 1], [4, 3], [5, 1], [6, 5]], [2, 2]), // 17
  A([1], [[2, 1], [3, 1], [4, 1], [5, 4], [6, 5]], [3, 3]), // 18
  A([1, 4, 5], [[2, 1], [3, 2], [6, 4], [6, 5]], [6, 6]), // 19
  A([1, 2, 4], [[3, 1], [3, 2], [5, 4], [6, 4]], [3, 3]), // 20
  A([1, 2, 4, 5], [[3, 1], [3, 2], [6, 4], [6, 5]], [3, 3]), // 21
  A([1, 3, 4, 5], [[2, 1], [6, 3], [6, 4], [6, 5]], [6, 6]), // 22
  A([1, 2, 4, 5], [[3, 2], [6, 4], [6, 5]], [6, 6]), // 23
  A([1, 2, 3, 4, 5], [[6, 3], [6, 4], [6, 5]], [6, 6]), // 24
  A([1, 2, 3, 4, 5], [[6, 4], [6, 5]], [6, 6]), // 25
  A([1, 2, 4], [[3, 2], [5, 4], [6, 4]], [6, 6]), // 26
  A([1, 2, 4], [[3, 2], [5, 4], [6, 4]], [3, 3]), // 27
  A([1, 3, 6], [[2, 1], [4, 3], [5, 4]], [5, 5]), // 28
  A([1, 2, 3, 5], [[4, 3], [6, 5]], [6, 6]), // 29
  A([1, 2, 3, 6], [[4, 3], [5, 4]], [5, 5]), // 30
  A([1, 2, 3, 4, 5], [[6, 5]], [6, 6]), // 31
  A([1, 2, 3, 4, 5, 6], [], [6, 6]), // 32
]

export interface AlgoLayout {
  pos: Record<number, { col: number; row: number }>
  cols: number
  rows: number
}

/** Acomoda los operadores para dibujar el diagrama: portadoras abajo,
 *  cada modulador arriba de su destino. */
export function layoutAlgorithm(a: Algorithm): AlgoLayout {
  const targetsOf = (op: number) => a.mods.filter(([f]) => f === op).map(([, t]) => t)
  const modsOf = (op: number) => a.mods.filter(([, t]) => t === op).map(([f]) => f).sort((x, y) => x - y)

  const rowMemo: Record<number, number> = {}
  const row = (op: number): number => {
    if (rowMemo[op] !== undefined) return rowMemo[op]
    const t = targetsOf(op)
    return (rowMemo[op] = a.carriers.includes(op) || t.length === 0 ? 0 : 1 + Math.max(...t.map(row)))
  }

  const col: Record<number, number> = {}
  let next = 0
  const place = (op: number) => {
    if (col[op] !== undefined) return
    const fresh = modsOf(op).filter((m) => col[m] === undefined)
    fresh.forEach(place)
    col[op] = fresh.length ? fresh.reduce((s, m) => s + col[m], 0) / fresh.length : next++
  }
  ;[...a.carriers].sort((x, y) => x - y).forEach(place)
  for (let op = 1; op <= 6; op++) place(op)

  // un modulador con varios destinos se centra entre ellos
  for (let op = 1; op <= 6; op++) {
    const t = targetsOf(op)
    if (t.length > 1) col[op] = t.reduce((s, x) => s + col[x], 0) / t.length
  }

  const pos: AlgoLayout['pos'] = {}
  let rows = 0
  for (let op = 1; op <= 6; op++) {
    pos[op] = { col: col[op], row: row(op) }
    rows = Math.max(rows, row(op) + 1)
  }
  return { pos, cols: next, rows }
}
