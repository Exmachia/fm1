// Modelo de una voz del FM-1. Es el mismo modelo de parámetros que el DX7
// (el FM-1 importa bancos SysEx de DX7) más el ADSR global y la cadena de FX
// propios del FM-1. Rangos tomados del manual.

export interface OpParams {
  rates: number[]   // Rate 1–4 (0–99)
  levels: number[]  // Level 1–4 (0–99)
  detune: number    // 0–14 (7 = centro)
  coarse: number    // FreqCoarse 0–31
  fine: number      // FreqFine 0–99
  fixed: boolean    // OscMode Ratio / Fixed
  ams: number       // A ModSens 0–3
  velSens: number   // KeyVelocity 0–7
  level: number     // Out Level 0–99
  lDepth: number    // L Depth 0–99
  rDepth: number    // R Depth 0–99
  bp: number        // BreakPoint 0–99 (A-1 … C7)
  lCurve: number    // 0–3: −LN −EX +LN +EX
  rCurve: number
  rateScale: number // 0–7
}

export type FxId = 'filter' | 'reverb' | 'delay' | 'distortion' | 'chorus' | 'phaser'

export interface FxUnit {
  on: boolean
  /** Sub-tipo (solo Filter y Reverb). */
  type: number
  /** Parámetros en el orden de las perillas. */
  p: number[]
}

export interface FxChain {
  order: FxId[]
  units: Record<FxId, FxUnit>
}

export interface Patch {
  name: string
  ops: OpParams[] // ops[0] = OP1
  pitchEnv: { rates: number[]; levels: number[] }
  algorithm: number // 0–31 (se muestra 1–32)
  feedback: number  // 0–7
  oscSync: boolean
  transpose: number // 0–48 (24 = sin transponer)
  lfo: { wave: number; speed: number; pmd: number; amd: number; delay: number; pitchSens: number; sync: number }
  env: { a: number; d: number; s: number; r: number } // ADSR 0–8
  fx: FxChain
}

export const LFO_WAVES = ['Triangle', 'Saw Down', 'Saw Up', 'Square', 'Sine', 'S&Hold']
export const CURVES = ['-LN', '-EX', '+LN', '+EX']
export const FILTER_TYPES = ['Low Pass', 'Band Pass', 'High Pass']
export const REVERB_TYPES = ['Room', 'Hall', 'Plate']
export const FX_NAMES: Record<FxId, string> = {
  filter: 'Filter', reverb: 'Reverb', delay: 'Delay', distortion: 'Distortion', chorus: 'Chorus', phaser: 'Phaser',
}

/** CutOff: 100 pasos logarítmicos de 100 Hz a 20 000 Hz. */
export const cutoffHz = (step: number) => Math.round(100 * Math.pow(200, step / 99))

/** Relación de frecuencia de un operador en modo Ratio (como en el DX7). */
export const opRatio = (o: OpParams) => (o.coarse === 0 ? 0.5 : o.coarse) * (1 + o.fine / 100)

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
/** Nombre de nota con la convención del DX7 (C3 = MIDI 60). */
export const noteName = (midi: number) => `${NOTE_NAMES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 2}`
/** BreakPoint 0 = A-1. */
export const breakPointName = (bp: number) => noteName(bp + 21)

export const makeOp = (o: Partial<OpParams> = {}): OpParams => ({
  rates: [99, 99, 99, 99],
  levels: [99, 99, 99, 0],
  detune: 7,
  coarse: 1,
  fine: 0,
  fixed: false,
  ams: 0,
  velSens: 2,
  level: 0,
  lDepth: 0,
  rDepth: 0,
  bp: 39,
  lCurve: 0,
  rCurve: 0,
  rateScale: 0,
  ...o,
})

export const defaultFx = (): FxChain => ({
  order: ['filter', 'reverb', 'delay', 'distortion', 'chorus', 'phaser'],
  units: {
    filter: { on: true, type: 0, p: [99, 10] },
    reverb: { on: true, type: 1, p: [40, 30] },
    delay: { on: true, type: 0, p: [30, 40, 15] },
    distortion: { on: false, type: 0, p: [20, 50, 70] },
    chorus: { on: true, type: 0, p: [30, 40, 25] },
    phaser: { on: false, type: 0, p: [30, 50, 30] },
  },
})

export const makePatch = (p: Partial<Patch> & { ops: OpParams[] }): Patch => ({
  name: 'INIT VOICE',
  pitchEnv: { rates: [99, 99, 99, 99], levels: [50, 50, 50, 50] },
  algorithm: 0,
  feedback: 0,
  oscSync: true,
  transpose: 24,
  lfo: { wave: 0, speed: 35, pmd: 0, amd: 0, delay: 0, pitchSens: 3, sync: 1 },
  env: { a: 0, d: 4, s: 8, r: 3 },
  fx: defaultFx(),
  ...p,
})

export const clonePatch = (p: Patch): Patch => structuredClone(p)
