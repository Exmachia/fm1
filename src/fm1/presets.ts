// Banco de 128 voces. El manual no trae la lista de fábrica: solo sabemos que
// existen "001 PIANO 1" (foto) y "032 BRASS 1" (manual). Este banco es propio,
// con nombres en el mismo formato y respetando esas dos posiciones.
// Los sonidos se afinan en la fase 3 (motor de audio).

import { makeOp, makePatch, type OpParams, type Patch } from './patch'

type Arch = (v: number) => Omit<Partial<Patch>, 'ops'> & { ops: OpParams[] }

const decay = (r1: number, r2: number, l2: number, r4 = 60) => ({ rates: [r1, r2, 30, r4], levels: [99, l2, 0, 0] })
const sustain = (r1: number, l3 = 90, r4 = 50) => ({ rates: [r1, 50, 40, r4], levels: [99, 95, l3, 0] })

const ARCH: Record<string, Arch> = {
  piano: (v) => ({
    algorithm: 4, feedback: 6 - (v % 3),
    ops: [
      makeOp({ ...decay(96, 25, 75, 67), level: 99, velSens: 2 }),
      makeOp({ ...decay(95, 50, 60, 78), level: 78 - v * 2, velSens: 7 }),
      makeOp({ ...decay(95, 20, 80, 67), level: 99, detune: 8, velSens: 2 }),
      makeOp({ ...decay(98, 60, 50, 80), level: 74, coarse: 1, velSens: 7 }),
      makeOp({ ...decay(95, 28, 75, 67), level: 95, detune: 6 }),
      makeOp({ ...decay(97, 70, 0, 80), level: 70, coarse: 14, velSens: 6 }),
    ],
    env: { a: 0, d: 5, s: 4, r: 3 },
  }),
  epiano: (v) => ({
    algorithm: 4, feedback: 6,
    ops: [
      makeOp({ ...decay(95, 29, 80, 72), level: 99, velSens: 2 }),
      makeOp({ ...decay(95, 20, 0, 70), level: 58 + v * 3, coarse: 14, velSens: 7 }),
      makeOp({ ...decay(95, 29, 80, 72), level: 99, detune: 9 }),
      makeOp({ ...decay(95, 29, 80, 72), level: 89, velSens: 6 }),
      makeOp({ ...decay(95, 20, 85, 72), level: 99, detune: 5 }),
      makeOp({ ...decay(95, 29, 80, 72), level: 79, velSens: 6 }),
    ],
    env: { a: 0, d: 5, s: 5, r: 3 },
  }),
  clav: (v) => ({
    algorithm: 2, feedback: 7,
    ops: [
      makeOp({ ...decay(99, 50, 60, 85), level: 99 }),
      makeOp({ ...decay(99, 60, 40, 85), level: 85 - v * 3, coarse: 3, velSens: 6 }),
      makeOp({ ...decay(99, 70, 40, 85), level: 80, coarse: 5 }),
      makeOp({ ...decay(99, 50, 60, 85), level: 99, detune: 9 }),
      makeOp({ ...decay(99, 60, 50, 85), level: 75, coarse: 1 }),
      makeOp({ ...decay(99, 80, 0, 85), level: 70, coarse: 7 }),
    ],
    env: { a: 0, d: 3, s: 3, r: 1 },
  }),
  organ: (v) => ({
    algorithm: 31, feedback: v % 2 ? 4 : 0,
    ops: [0.5, 1, 2, 3, 4, 6].map((r, i) =>
      makeOp({ ...sustain(99, 99, 70), level: [92, 99, 88, 80, 76 - v * 4, 70][i], coarse: r === 0.5 ? 0 : r, detune: 7 + (i % 2) })),
    env: { a: 0, d: 0, s: 8, r: 1 },
  }),
  mallet: (v) => ({
    algorithm: 4, feedback: 3,
    ops: [
      makeOp({ ...decay(99, 35, 0, 40), level: 99 }),
      makeOp({ ...decay(99, 70, 0, 70), level: 72, coarse: 4 + v, velSens: 6 }),
      makeOp({ ...decay(99, 30, 0, 40), level: 92, detune: 8, coarse: 1 }),
      makeOp({ ...decay(99, 75, 0, 70), level: 65, coarse: 10, velSens: 6 }),
      makeOp({ ...decay(99, 40, 0, 40), level: 88, coarse: 4 }),
      makeOp({ ...decay(99, 80, 0, 70), level: 60, coarse: 1 }),
    ],
    env: { a: 0, d: 4, s: 0, r: 4 },
  }),
  bells: (v) => ({
    algorithm: 4, feedback: 2,
    ops: [
      makeOp({ ...decay(99, 22, 0, 30), level: 99 }),
      makeOp({ ...decay(99, 30, 0, 40), level: 78, coarse: 3, fine: 50, velSens: 5 }),
      makeOp({ ...decay(99, 20, 0, 30), level: 90, coarse: 2 }),
      makeOp({ ...decay(99, 30, 0, 40), level: 70, coarse: 7, fine: 7 * v }),
      makeOp({ ...decay(99, 18, 0, 30), level: 85, coarse: 4, detune: 9 }),
      makeOp({ ...decay(99, 25, 0, 40), level: 72, coarse: 11 }),
    ],
    env: { a: 0, d: 7, s: 0, r: 7 },
  }),
  brass: (v) => ({
    algorithm: 21, feedback: 7,
    ops: [
      makeOp({ ...sustain(62, 88, 60), level: 99, detune: 6 }),
      makeOp({ ...sustain(60, 80, 60), level: 86 - v * 2, coarse: 1, velSens: 4 }),
      makeOp({ ...sustain(60, 90, 60), level: 99 }),
      makeOp({ ...sustain(60, 90, 60), level: 99, detune: 8 }),
      makeOp({ ...sustain(60, 90, 60), level: 97, detune: 9 }),
      makeOp({ ...sustain(55, 85, 60), level: 86, coarse: 1 }),
    ],
    env: { a: 2, d: 3, s: 7, r: 2 },
  }),
  strings: (v) => ({
    algorithm: 1, feedback: 6,
    ops: [
      makeOp({ ...sustain(45 - v * 4, 95, 40), level: 99 }),
      makeOp({ ...sustain(40, 85, 40), level: 72, coarse: 1, detune: 9 }),
      makeOp({ ...sustain(45, 95, 40), level: 99, detune: 5 }),
      makeOp({ ...sustain(40, 85, 40), level: 74, coarse: 1 }),
      makeOp({ ...sustain(40, 85, 40), level: 66, coarse: 3 }),
      makeOp({ ...sustain(40, 80, 40), level: 70, coarse: 1, detune: 10 }),
    ],
    lfo: { wave: 4, speed: 30, pmd: 6, amd: 0, delay: 40, pitchSens: 3, sync: 0 },
    env: { a: 4, d: 2, s: 8, r: 5 },
  }),
  pad: (v) => ({
    algorithm: 4, feedback: 5,
    ops: [
      makeOp({ ...sustain(50, 99, 30), level: 99, detune: 4 }),
      makeOp({ ...sustain(45, 80, 30), level: 60 + (v % 6) * 3, coarse: 2 }),
      makeOp({ ...sustain(50, 99, 30), level: 99, detune: 10 }),
      makeOp({ ...sustain(45, 80, 30), level: 62, coarse: 1 + (v % 3) }),
      makeOp({ ...sustain(48, 99, 30), level: 95 }),
      makeOp({ ...sustain(40, 85, 30), level: 58, coarse: 3 }),
    ],
    lfo: { wave: 0, speed: 20, pmd: 4, amd: 10, delay: 30, pitchSens: 2, sync: 0 },
    env: { a: 5, d: 3, s: 8, r: 7 },
  }),
  flute: (v) => ({
    algorithm: 15, feedback: 4,
    ops: [
      makeOp({ ...sustain(70, 95, 60), level: 99 }),
      makeOp({ ...sustain(80, 60, 60), level: 55 + v * 3, coarse: 1 }),
      makeOp({ ...sustain(70, 50, 60), level: 50, coarse: 2 }),
      makeOp({ ...sustain(70, 50, 60), level: 40, coarse: 3 }),
      makeOp({ ...sustain(75, 40, 60), level: 48, coarse: 1, detune: 9 }),
      makeOp({ ...decay(99, 70, 0, 90), level: 60, coarse: 8 }),
    ],
    lfo: { wave: 4, speed: 34, pmd: 5, amd: 0, delay: 50, pitchSens: 3, sync: 0 },
    env: { a: 2, d: 2, s: 8, r: 2 },
  }),
  bass: (v) => ({
    algorithm: 0, feedback: 6 + (v % 2),
    ops: [
      makeOp({ ...decay(99, 40, 85, 80), level: 99, coarse: 0 }),
      makeOp({ ...decay(99, 55, 50, 80), level: 82 - v * 2, coarse: 0, velSens: 6 }),
      makeOp({ ...decay(99, 40, 85, 80), level: 95, coarse: 0, detune: 8 }),
      makeOp({ ...decay(99, 60, 40, 80), level: 78, coarse: 1 }),
      makeOp({ ...decay(99, 70, 30, 80), level: 70, coarse: 1 }),
      makeOp({ ...decay(99, 80, 0, 80), level: 65, coarse: 3 }),
    ],
    env: { a: 0, d: 4, s: 6, r: 1 },
  }),
  lead: (v) => ({
    algorithm: 17, feedback: 7,
    ops: [
      makeOp({ ...sustain(90, 95, 60), level: 99 }),
      makeOp({ ...sustain(90, 80, 60), level: 80, coarse: 1 }),
      makeOp({ ...sustain(90, 85, 60), level: 85 - v * 3, coarse: 1, detune: 9 }),
      makeOp({ ...sustain(90, 80, 60), level: 75, coarse: 2 }),
      makeOp({ ...sustain(90, 80, 60), level: 70, coarse: 1 }),
      makeOp({ ...sustain(90, 80, 60), level: 74, coarse: 3 }),
    ],
    lfo: { wave: 0, speed: 40, pmd: 8, amd: 0, delay: 55, pitchSens: 4, sync: 0 },
    env: { a: 0, d: 2, s: 8, r: 2 },
  }),
  pluck: (v) => ({
    algorithm: 2, feedback: 5,
    ops: [
      makeOp({ ...decay(99, 38, 0, 60), level: 99 }),
      makeOp({ ...decay(99, 55, 0, 70), level: 80, coarse: 2 + (v % 3), velSens: 6 }),
      makeOp({ ...decay(99, 50, 0, 70), level: 70, coarse: 3 }),
      makeOp({ ...decay(99, 35, 0, 60), level: 96, detune: 9 }),
      makeOp({ ...decay(99, 55, 0, 70), level: 74, coarse: 1 }),
      makeOp({ ...decay(99, 70, 0, 70), level: 66, coarse: 5 }),
    ],
    env: { a: 0, d: 4, s: 0, r: 3 },
  }),
  sfx: (v) => ({
    algorithm: 7 + (v % 8), feedback: 7,
    ops: [1, 7, 1, 13, 3, 23].map((c, i) => makeOp({ ...sustain(40 + i * 8, 80, 30), level: i % 2 ? 80 : 99, coarse: c, fine: v * 9 })),
    pitchEnv: { rates: [60, 40, 30, 50], levels: [70, 45, 50, 50] },
    lfo: { wave: 5, speed: 60, pmd: 20, amd: 0, delay: 0, pitchSens: 5, sync: 0 },
    env: { a: 3, d: 4, s: 6, r: 6 },
  }),
}

/** [nombre, cuántas, arquetipo, desfase de variante para que dos familias no suenen igual] */
const BANK_LAYOUT: [name: string, count: number, arch: keyof typeof ARCH, offset?: number][] = [
  ['PIANO', 4, 'piano'],
  ['E.PIANO', 4, 'epiano'],
  ['CLAV', 4, 'clav'],
  ['HARPSI', 3, 'clav', 4],
  ['ORGAN', 4, 'organ'],
  ['VIBES', 3, 'mallet'],
  ['MARIMBA', 3, 'mallet', 3],
  ['BELLS', 6, 'bells'],
  ['BRASS', 6, 'brass'], // 032 = BRASS 1, como en el manual
  ['STRINGS', 6, 'strings'],
  ['CHOIR', 4, 'pad', 5],
  ['FLUTE', 4, 'flute'],
  ['REED', 4, 'flute', 4],
  ['GUITAR', 4, 'pluck'],
  ['HARP', 3, 'pluck', 3],
  ['KOTO', 3, 'pluck', 6],
  ['BASS', 10, 'bass'],
  ['SYN BASS', 6, 'bass', 4],
  ['LEAD', 8, 'lead'],
  ['PAD', 10, 'pad'],
  ['SYNTH', 8, 'lead', 4],
  ['GLASS', 4, 'bells', 3],
  ['TOY', 3, 'mallet', 6],
  ['PERC', 4, 'mallet', 9],
  ['SFX', 10, 'sfx'],
]

export function factoryBank(): Patch[] {
  const bank: Patch[] = []
  for (const [name, count, arch, offset = 0] of BANK_LAYOUT) {
    for (let v = 0; v < count; v++) bank.push(makePatch({ ...ARCH[arch](v + offset), name: `${name} ${v + 1}` }))
  }
  if (bank.length !== 128) throw new Error(`El banco tiene ${bank.length} voces, deben ser 128`)
  return bank
}
