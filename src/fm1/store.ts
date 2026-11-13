// "Firmware" del FM-1: modela el comportamiento descrito en el manual.
// La UI solo llama a turn / buttonDown / buttonUp / keyDown / keyUp, y la
// pantalla y los LEDs se calculan a partir de este estado.

import { create } from 'zustand'
import { BASE_NOTE, KEYS, type ButtonId, type KnobId } from '../device/layout'
import { clonePatch, type Patch } from './patch'
import { factoryBank } from './presets'
import { RATE_BEATS, emptyPattern, fmtParam, pagesFor } from './params'

export type Mode = 'home' | 'fx' | 'env' | 'lfo' | 'edit' | 'glo' | 'arp' | 'seq'
export type Section = 0 | 1 | 2 | 3 | 4 | 5 | 'pit' | 'glo'

export interface Popup { kind: 'presets' | 'algorithm' | 'text'; lines?: string[]; until: number }

export interface FM1State {
  // físico
  angles: Record<KnobId, number>
  master: number
  pressedKeys: Set<number>
  pressedButtons: Set<ButtonId>
  keyNotes: Record<number, number>

  // firmware
  mode: Mode
  page: number
  section: Section
  presetIndex: number
  bank: Patch[]
  patch: Patch
  octave: number
  transpose: number
  voiceMode: 'poly' | 'mono'
  fxSelected: number
  fxGrabbed: boolean
  global: { noteCh: number; fxCh: number; pbUp: number; pbDown: number }
  arp: { on: boolean; mode: number; octave: number; rate: number; gate: number; swing: number; latch: number }
  seq: {
    on: boolean; playing: boolean; recording: boolean; pattern: number
    patterns: number[][][]; step: number; recPos: number; rate: number; gate: number; swing: number
  }
  tempo: number
  bt: 'off' | 'on'
  popup: Popup | null
  paramText: { text: string; knob: number; until: number } | null
  confirmReset: boolean
  saving: boolean
  /** Notas sonando (teclas, ARP y SEQ), con repetición si suenan dos veces. */
  sounding: number[]
  /** Notas sostenidas con las teclas, en el orden en que se presionaron. */
  held: number[]
  latched: number[]

  // pseudo-campos que devuelven algunas perillas de acción
  popupText?: string[]
  saveGlobalRequested?: boolean

  turn: (id: KnobId, detents: number) => void
  buttonDown: (id: ButtonId) => void
  buttonUp: (id: ButtonId) => void
  keyDown: (index: number) => void
  keyUp: (index: number) => void
  /** Nota que llega por MIDI (otro teclado o el FM-1 real por USB). */
  externalNote: (note: number, velocity: number, on: boolean) => void
  /** Suena una nota sin contar como tocada por ti (demos de las lecciones). */
  preview: (note: number, on: boolean) => void
}

// ── Eventos de nota (el motor de audio de la fase 3 se suscribe aquí) ──
export type NoteEvent = { on: boolean; note: number; velocity: number }
const noteListeners = new Set<(e: NoteEvent) => void>()
export const onNote = (fn: (e: NoteEvent) => void) => {
  noteListeners.add(fn)
  return () => noteListeners.delete(fn)
}

// ── Notas que tocas tú (teclas, teclado de la compu o MIDI), no el ARP/SEQ ──
const playedListeners = new Set<(note: number) => void>()
export const onPlayed = (fn: (note: number) => void) => {
  playedListeners.add(fn)
  return () => playedListeners.delete(fn)
}
const played = (note: number) => playedListeners.forEach((fn) => fn(note))

// ── Persistencia (solo conveniencia local; puede fallar sin problema) ──
const BANK_KEY = 'fm1.bank.v1'
const GLOBAL_KEY = 'fm1.global.v1'
const load = <T,>(key: string): T | null => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}
const store = (key: string, value: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* almacenamiento bloqueado: se queda en memoria */
  }
}

/** Teclas negras con función en EDIT: índice → etiqueta. */
export const COMBO_KEYS: Record<number, string> = Object.fromEntries(
  KEYS.filter((k) => k.label).map((k) => [k.index, k.label]),
)

const POPUP_MS = 1000
const PARAM_MS = 1800
const DEG_PER_DETENT = 15
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))
const signed = (v: number) => (v > 0 ? `+${v}` : `${v}`)

const initialBank = load<Patch[]>(BANK_KEY) ?? factoryBank()
const initialGlobal = load<FM1State['global']>(GLOBAL_KEY) ?? { noteCh: 1, fxCh: 2, pbUp: 2, pbDown: 2 }

// estado de botones con doble función
const timers: Partial<Record<ButtonId, ReturnType<typeof setTimeout>>> = {}
const consumed = new Set<ButtonId>()

export const useFM1 = create<FM1State>((set, get) => {
  const popText = (lines: string[]) => set({ popup: { kind: 'text', lines, until: Date.now() + POPUP_MS } })

  const noteOn = (note: number, velocity = 100) => {
    set((s) => ({ sounding: [...s.sounding, note] }))
    noteListeners.forEach((fn) => fn({ on: true, note, velocity }))
  }
  const noteOff = (note: number) => {
    set((s) => {
      const i = s.sounding.indexOf(note)
      if (i < 0) return s
      const sounding = [...s.sounding]
      sounding.splice(i, 1)
      return { sounding }
    })
    noteListeners.forEach((fn) => fn({ on: false, note, velocity: 0 }))
  }
  const allNotesOff = () => {
    get().sounding.forEach((n) => noteListeners.forEach((fn) => fn({ on: false, note: n, velocity: 0 })))
    set({ sounding: [] })
  }

  // ── Reloj del ARP y del SEQ ───────────────────────────────────────────
  let clock: ReturnType<typeof setTimeout> | null = null
  let tickCount = 0
  let arpIndex = 0

  const arpSequence = (s: FM1State): number[] => {
    const src = s.arp.latch ? s.latched : s.held
    if (!src.length) return []
    const base = s.arp.mode === 4 ? src : [...new Set(src)].sort((a, b) => a - b)
    const notes: number[] = []
    for (let o = 0; o < s.arp.octave; o++) base.forEach((n) => notes.push(n + 12 * o))
    switch (s.arp.mode) {
      case 1: return [...notes].reverse()
      case 2: return [...notes, ...[...notes].reverse()]
      case 3: return notes.length > 2 ? [...notes, ...notes.slice(1, -1).reverse()] : notes
      case 5: return notes.flatMap((n) => [n, n])
      default: return notes
    }
  }

  const tick = () => {
    const s = get()
    const arpNotes = s.arp.on ? arpSequence(s) : []
    const seqRunning = s.seq.on && (s.seq.playing || s.seq.recording)
    if (!arpNotes.length && !seqRunning) {
      clock = null
      return
    }
    const rate = RATE_BEATS[s.arp.on ? s.arp.rate : s.seq.rate]
    const stepMs = (60000 / s.tempo) * rate
    const gate = (s.arp.on ? s.arp.gate : s.seq.gate) / 100
    const swing = ((s.arp.on ? s.arp.swing : s.seq.swing) - 50) / 100

    const play = (notes: number[]) => {
      notes.forEach((n) => noteOn(n))
      setTimeout(() => notes.forEach((n) => noteOff(n)), stepMs * gate * 0.98)
    }

    if (arpNotes.length) {
      const note = s.arp.mode === 6
        ? arpNotes[Math.floor(Math.random() * arpNotes.length)]
        : arpNotes[arpIndex % arpNotes.length]
      arpIndex++
      play([note])
    } else if (seqRunning) {
      const pattern = s.seq.patterns[s.seq.pattern]
      let last = -1
      pattern.forEach((st, i) => st.length && (last = i))
      const length = last < 0 ? 16 : Math.max(last + 1, s.seq.recording ? s.seq.recPos + 1 : 0)
      const step = (s.seq.step + 1) % Math.min(16, length)
      set({ seq: { ...s.seq, step } })
      play(pattern[step])
    }

    tickCount++
    const interval = stepMs * (tickCount % 2 ? 1 + swing : 1 - swing)
    clock = setTimeout(tick, interval)
  }
  const ensureClock = () => {
    if (clock === null) {
      tickCount = 0
      tick()
    }
  }
  const stopClock = () => {
    if (clock !== null) clearTimeout(clock)
    clock = null
    arpIndex = 0
    allNotesOff()
  }

  // ── Cambios de modo ───────────────────────────────────────────────────
  const toggleMode = (m: Mode) =>
    set((s) => (s.mode === m
      ? { mode: 'home', page: 0, fxGrabbed: false, confirmReset: false, paramText: null }
      : { mode: m, page: 0, fxGrabbed: false, confirmReset: false, paramText: null }))

  const loadPreset = (index: number) => {
    const s = get()
    set({ presetIndex: index, patch: clonePatch(s.bank[index]), popup: { kind: 'presets', until: Date.now() + POPUP_MS } })
  }

  const applyResult = (r: Partial<FM1State>) => {
    const { popupText, saveGlobalRequested, ...rest } = r
    set(rest)
    if (popupText) popText(popupText)
    if (saveGlobalRequested) {
      store(GLOBAL_KEY, get().global)
      popText(['Globe Saved'])
    }
  }

  return {
    angles: { master: 0, select: 0, presets: 0, algorithm: 0, knob1: 0, knob2: 0, knob3: 0, knob4: 0 },
    master: 0.7,
    pressedKeys: new Set(),
    pressedButtons: new Set(),
    keyNotes: {},

    mode: 'home',
    page: 0,
    section: 0,
    presetIndex: 0,
    bank: initialBank,
    patch: clonePatch(initialBank[0]),
    octave: 0,
    transpose: 0,
    voiceMode: 'poly',
    fxSelected: 0,
    fxGrabbed: false,
    global: initialGlobal,
    arp: { on: false, mode: 0, octave: 1, rate: 3, gate: 60, swing: 50, latch: 0 },
    seq: {
      on: false, playing: false, recording: false, pattern: 0,
      patterns: Array.from({ length: 16 }, emptyPattern), step: -1, recPos: 0, rate: 3, gate: 60, swing: 50,
    },
    tempo: 120,
    bt: 'off',
    popup: null,
    paramText: null,
    confirmReset: false,
    saving: false,
    sounding: [],
    held: [],
    latched: [],

    // ── Perillas ────────────────────────────────────────────────────────
    turn: (id, det) => {
      if (!det) return
      const s = get()
      const dir = Math.sign(det)
      if (id !== 'master') set({ angles: { ...s.angles, [id]: s.angles[id] + det * DEG_PER_DETENT } })

      switch (id) {
        case 'master': {
          const master = clamp(s.master + det * 0.02, 0, 1)
          set({ master })
          popText(['Volume', `${Math.round(master * 100)}`])
          return
        }
        case 'presets':
          loadPreset((((s.presetIndex + det) % 128) + 128) % 128)
          return
        case 'algorithm': {
          const down = s.pressedButtons.has('octDown')
          const up = s.pressedButtons.has('octUp')
          if (down || up) {
            consumed.add(down ? 'octDown' : 'octUp')
            const transpose = down ? clamp(s.transpose + det, -12, 0) : clamp(s.transpose + det, 0, 12)
            set({ transpose })
            popText(['Transpose', signed(transpose)])
            return
          }
          const patch = clonePatch(s.patch)
          patch.algorithm = clamp(patch.algorithm + det, 0, 31)
          set({ patch, popup: { kind: 'algorithm', until: Date.now() + POPUP_MS } })
          return
        }
        case 'select': {
          if (s.mode === 'fx') {
            const target = clamp(s.fxSelected + det, 0, 5)
            if (s.fxGrabbed && target !== s.fxSelected) {
              // el efecto agarrado se va intercambiando con sus vecinos
              const patch = clonePatch(s.patch)
              const order = patch.fx.order
              for (let i = s.fxSelected; i !== target; i += dir) [order[i], order[i + dir]] = [order[i + dir], order[i]]
              set({ patch, fxSelected: target, paramText: null })
            } else set({ fxSelected: target, paramText: null })
            return
          }
          const pages = pagesFor(s).length
          set({ page: clamp(s.page + det, 0, pages - 1), paramText: null })
          return
        }
        default: {
          const k = Number(id.slice(-1)) - 1
          if (s.confirmReset) {
            if (k === 3) {
              const bank = factoryBank()
              store(BANK_KEY, bank)
              set({ bank, patch: clonePatch(bank[s.presetIndex]), confirmReset: false })
              popText(['Reset Success'])
            } else if (k === 0) set({ confirmReset: false })
            return
          }
          const param = pagesFor(s)[s.page]?.params[k]
          if (!param) return
          if (param.action) {
            const r = param.action(s, dir)
            if (r) applyResult(r)
            set({ paramText: { text: param.label, knob: k, until: Date.now() + PARAM_MS } })
            return
          }
          const step = param.step ?? 1
          const v = clamp(param.get(s) + det * step, param.min, param.max)
          applyResult(param.set(s, v))
          const after = get()
          set({ paramText: { text: `${param.label}: ${fmtParam(param, after)}`, knob: k, until: Date.now() + PARAM_MS } })
        }
      }
    },

    // ── Botones ─────────────────────────────────────────────────────────
    buttonDown: (id) => {
      const s = get()
      set({ pressedButtons: new Set(s.pressedButtons).add(id) })
      consumed.delete(id)

      switch (id) {
        case 'fx':
        case 'env':
        case 'lfo':
        case 'edit':
        case 'glo':
          toggleMode(id)
          return
        case 'sel':
          if (s.mode === 'fx') set({ fxGrabbed: !s.fxGrabbed })
          return
        case 'home':
          timers.home = setTimeout(() => {
            consumed.add('home')
            set((st) => ({ bt: st.bt === 'off' ? 'on' : 'off' }))
            popText([get().bt === 'on' ? 'Bluetooth On' : 'Bluetooth Off'])
          }, 800)
          return
        case 'save':
          timers.save = setTimeout(() => {
            const st = get()
            const bank = [...st.bank]
            bank[st.presetIndex] = clonePatch(st.patch)
            store(BANK_KEY, bank)
            set({ bank, saving: true })
            popText(['Preset Saved'])
          }, 600)
          return
        case 'arp':
          if (s.seq.on) return popText(['Disable SEQ to enter'])
          if (s.arp.on && s.mode === 'arp') {
            set({ arp: { ...s.arp, on: false }, mode: 'home', page: 0, latched: [] })
            stopClock()
          } else if (s.arp.on) set({ mode: 'arp', page: 0, paramText: null })
          else {
            allNotesOff()
            set({ arp: { ...s.arp, on: true }, mode: 'arp', page: 0, paramText: null })
            ensureClock()
          }
          return
        case 'seq':
          if (s.arp.on) return popText(['Disable ARP to enter'])
          if (s.seq.on && s.mode === 'seq') {
            set({ seq: { ...s.seq, on: false, playing: false, recording: false, step: -1 }, mode: 'home', page: 0 })
            stopClock()
          } else if (s.seq.on) set({ mode: 'seq', page: 0, paramText: null })
          else set({ seq: { ...s.seq, on: true, playing: false, recording: false, step: -1 }, mode: 'seq', page: 0, paramText: null })
          return
        case 'play':
          if (!s.seq.on) return popText(['Enable SEQ first'])
          if (s.seq.playing || s.seq.recording) {
            set({ seq: { ...s.seq, playing: false, recording: false, step: -1 } })
            stopClock()
          } else {
            set({ seq: { ...s.seq, playing: true, step: -1 } })
            ensureClock()
          }
          return
        case 'rec':
          if (!s.seq.on) return popText(['Enable SEQ first'])
          if (s.seq.recording) set({ seq: { ...s.seq, recording: false } })
          else {
            set({ seq: { ...s.seq, recording: true, playing: true, recPos: 0, step: s.seq.playing ? s.seq.step : -1 } })
            ensureClock()
          }
          return
        case 'octDown':
        case 'octUp': {
          const other = id === 'octDown' ? 'octUp' : 'octDown'
          if (s.pressedButtons.has(other)) {
            consumed.add(id)
            consumed.add(other)
            set({ octave: 0, transpose: 0 })
            popText(['Octave', '0'])
          }
          return
        }
      }
    },

    buttonUp: (id) => {
      const s = get()
      const pressedButtons = new Set(s.pressedButtons)
      pressedButtons.delete(id)
      set({ pressedButtons })
      const t = timers[id]
      if (t) clearTimeout(t)
      delete timers[id]

      if (id === 'home' && !consumed.has('home')) {
        set({ mode: 'home', page: 0, fxGrabbed: false, confirmReset: false, paramText: null })
      }
      if (id === 'save') set({ saving: false })
      if ((id === 'octDown' || id === 'octUp') && !consumed.has(id)) {
        const octave = clamp(s.octave + (id === 'octUp' ? 1 : -1), -3, 3)
        set({ octave })
        popText(['Octave', signed(octave)])
      }
      consumed.delete(id)
    },

    // ── Teclas ──────────────────────────────────────────────────────────
    keyDown: (i) => {
      const s = get()
      if (s.pressedKeys.has(i)) return
      set({ pressedKeys: new Set(s.pressedKeys).add(i) })

      const combo = COMBO_KEYS[i]
      if (s.mode === 'edit' && combo) {
        if (combo.startsWith('OP')) set({ section: (Number(combo[2]) - 1) as Section, page: 0, paramText: null })
        else if (combo === 'PIT') set({ section: 'pit', page: 0, paramText: null })
        else if (combo === 'GLO') set({ section: 'glo', page: 0, paramText: null })
        else if (combo === 'MONO') set({ voiceMode: 'mono' })
        else if (combo === 'POLY') set({ voiceMode: 'poly' })
        return
      }

      const note = BASE_NOTE + i + s.octave * 12 + s.transpose
      set({ keyNotes: { ...s.keyNotes, [i]: note } })
      played(note)

      if (s.seq.on && s.seq.recording) {
        const patterns = s.seq.patterns.map((p) => p.map((st) => [...st]))
        const pat = patterns[s.seq.pattern]
        // si ya hay otra tecla sostenida, la nota se suma al mismo paso (acorde)
        const chord = s.held.length > 0 && s.seq.recPos > 0
        const at = chord ? s.seq.recPos - 1 : s.seq.recPos
        pat[at] = chord ? [...pat[at], note] : [note]
        set({ seq: { ...s.seq, patterns, recPos: chord ? s.seq.recPos : (s.seq.recPos + 1) % 16 } })
      }

      if (s.arp.on) {
        const latched = s.arp.latch ? (s.held.length === 0 ? [note] : [...s.latched, note]) : s.latched
        set({ held: [...s.held, note], latched })
        ensureClock()
        return
      }
      set({ held: [...get().held, note] })
      noteOn(note)
    },

    keyUp: (i) => {
      const s = get()
      if (!s.pressedKeys.has(i)) return
      const pressedKeys = new Set(s.pressedKeys)
      pressedKeys.delete(i)
      const note = s.keyNotes[i]
      const keyNotes = { ...s.keyNotes }
      delete keyNotes[i]
      const held = [...s.held]
      if (note !== undefined && held.includes(note)) held.splice(held.indexOf(note), 1)
      set({ pressedKeys, keyNotes, held })
      if (note === undefined) return
      if (!s.arp.on) noteOff(note)
    },

    externalNote: (note, velocity, on) => {
      const s = get()
      if (on) {
        played(note)
        if (s.arp.on) {
          const latched = s.arp.latch ? (s.held.length === 0 ? [note] : [...s.latched, note]) : s.latched
          set({ held: [...s.held, note], latched })
          ensureClock()
        } else noteOn(note, velocity)
        return
      }
      const held = [...s.held]
      if (held.includes(note)) held.splice(held.indexOf(note), 1)
      set({ held })
      if (!s.arp.on) noteOff(note)
    },

    preview: (note, on) => (on ? noteOn(note, 90) : noteOff(note)),
  }
})

// Los popups y textos temporales caducan solos: la pantalla los ignora
// después de `until`. Limpiamos el estado de vez en cuando para que los
// LEDs y la UI no dependan de valores viejos.
setInterval(() => {
  const s = useFM1.getState()
  const now = Date.now()
  if (s.popup && s.popup.until < now) useFM1.setState({ popup: null })
  if (s.paramText && s.paramText.until < now) useFM1.setState({ paramText: null })
}, 250)
