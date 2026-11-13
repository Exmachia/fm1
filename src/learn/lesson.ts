// Piezas comunes de las lecciones: el tipo de paso, cómo se señala la tecla
// que sigue y el reproductor de demos.

import { BASE_NOTE, KEYS } from '../device/layout'
import { useFM1, type FM1State } from '../fm1/store'
import { startAudio } from '../audio/engine'

export type Target = string | string[] | null

export interface Step {
  title: string
  body: string
  /** Lo que tienes que hacer, en corto (aparece como "Tu turno"). */
  task?: string
  /** Control que se ilumina. Puede cambiar según lo que vayas haciendo. */
  target?: Target | ((s: FM1State) => Target)
  /** Se cumple cuando hiciste lo que pide. Sin `check` ni `follow`, solo es para leer. */
  check?: (s: FM1State, start: FM1State) => boolean
  /** Notas que hay que tocar en orden; cada grupo es una nota o un acorde. */
  follow?: number[][]
  /** Lo que suena con "Escuchar". Si falta y hay `follow`, se toca eso parejo. */
  demo?: DemoEvent[]
}

export interface Lesson {
  id: string
  title: string
  subtitle: string
  steps: Step[]
}

/** Una nota de la demo: empieza en `t` ms y dura `d` ms. */
export interface DemoEvent { t: number; note: number; d: number }

const LAST_KEY = KEYS.length - 1

/** Tecla que toca esa nota con la octava y el transpose actuales, o el botón de octava que hace falta. */
export function keyFor(s: FM1State, note: number): string {
  const i = note - BASE_NOTE - s.octave * 12 - s.transpose
  if (i < 0) return 'octDown'
  if (i > LAST_KEY) return 'octUp'
  return `key-${i}`
}

export const keysFor = (s: FM1State, notes: number[]): Target => {
  const ids = [...new Set(notes.map((n) => keyFor(s, n)))]
  // si alguna nota no cabe, primero hay que mover la octava
  const oct = ids.find((id) => !id.startsWith('key-'))
  return oct ?? ids
}

const SOLFEO = ['Do', 'Do#', 'Re', 'Re#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si']
export const solfeo = (note: number) => SOLFEO[((note % 12) + 12) % 12]

/** Grupos parejos a partir de una lista de notas sueltas. */
export const singles = (notes: number[]) => notes.map((n) => [n])

/** Demo pareja: un grupo cada `stepMs`. */
export const evenDemo = (groups: number[][], stepMs: number, gate = 0.9): DemoEvent[] =>
  groups.flatMap((g, i) => g.map((note) => ({ t: i * stepMs, note, d: stepMs * gate })))

/** Toca una demo; devuelve con qué detenerla. `onEnd` se llama al terminar o al detener. */
export function playDemo(events: DemoEvent[], onEnd: () => void): () => void {
  const timers: ReturnType<typeof setTimeout>[] = []
  const sounding = new Set<number>()
  let stopped = false
  const { preview } = useFM1.getState()

  const finish = () => {
    if (stopped) return
    stopped = true
    timers.forEach(clearTimeout)
    sounding.forEach((n) => preview(n, false))
    sounding.clear()
    onEnd()
  }

  void startAudio().then(() => {
    if (stopped) return
    let end = 0
    for (const e of events) {
      timers.push(setTimeout(() => { sounding.add(e.note); preview(e.note, true) }, e.t))
      timers.push(setTimeout(() => { sounding.delete(e.note); preview(e.note, false) }, e.t + e.d))
      end = Math.max(end, e.t + e.d)
    }
    timers.push(setTimeout(finish, end + 300))
  })
  return finish
}
