// Motor de síntesis FM de 6 operadores (estilo DX7) que corre en el hilo de
// audio. Recibe la voz (Patch) y eventos de nota por `port`.
//
// Por cada muestra: los operadores se calculan del 6 al 1 (en los 32
// algoritmos un modulador siempre tiene número mayor que su destino), cada uno
// modula la fase de su destino, y se suman las portadoras.
// Envolventes, LFO y pitch EG se calculan por bloque de 128 muestras y las
// amplitudes se interpolan dentro del bloque para que no haya clics.

import { ALGORITHMS } from '../fm1/algorithms'
import type { Patch } from '../fm1/patch'

declare const sampleRate: number
declare function registerProcessor(name: string, ctor: unknown): void
declare class AudioWorkletProcessor {
  readonly port: MessagePort
}

export type WorkletMsg =
  | { type: 'patch'; patch: Patch }
  | { type: 'on'; note: number; velocity: number }
  | { type: 'off'; note: number }
  | { type: 'mono'; mono: boolean }
  | { type: 'panic' }

const BLOCK = 128
const MAX_VOICES = 12
const TWO_PI = Math.PI * 2
/** Índice de modulación máximo (radianes) con Out Level 99. */
const MOD_MAX = 4 * Math.PI

// ── Seno por tabla (más rápido que Math.sin) ───────────────────────────
const TABLE = 4096
const SINE = new Float32Array(TABLE + 1)
for (let i = 0; i <= TABLE; i++) SINE[i] = Math.sin((TWO_PI * i) / TABLE)
const sinCycles = (phase: number) => {
  const p = phase - Math.floor(phase)
  const x = p * TABLE
  const i = x | 0
  return SINE[i] + (SINE[i + 1] - SINE[i]) * (x - i)
}

// ── Escalas tipo DX7 ────────────────────────────────────────────────────
/** Nivel 0–99 → amplitud. 0.75 dB por paso; cae a 0 suavemente abajo de 20. */
const levelAmp = (l: number) => (l <= 0 ? 0 : Math.pow(2, (l - 99) / 8) * (l < 20 ? l / 20 : 1))
/** Rate 0–99 → segundos para recorrer los 99 niveles. */
const rateTime = (r: number) => 0.002 + 45 * Math.pow(1 - Math.min(99, Math.max(0, r)) / 99, 3.2)
/** Las subidas son mucho más rápidas que las bajadas (como en el DX7). */
const riseTime = (r: number) => 0.001 + 10 * Math.pow(1 - Math.min(99, Math.max(0, r)) / 99, 4)
/** Al subir, el DX7 brinca de inmediato a un nivel audible. */
const ATTACK_FLOOR = 40
const PITCH_SENS = [0, 0.45, 0.9, 1.6, 2.6, 4.2, 7, 12]
const AMP_SENS = [0, 0.3, 0.6, 1]
const ADSR_A = [0.002, 0.01, 0.03, 0.07, 0.15, 0.3, 0.6, 1.2, 2.5]
const ADSR_D = [0.05, 0.1, 0.2, 0.4, 0.8, 1.5, 3, 5, 8]
const ADSR_R = [0.008, 0.05, 0.1, 0.25, 0.5, 1, 2, 4, 7]
const lfoHz = (speed: number) => 0.06 * Math.exp(speed * 0.068)

/** Envolvente de 4 etapas (rate/level) en unidades de nivel 0–99. */
class Eg {
  stage = 4
  level = 0
  start(from: number) {
    this.stage = 0
    this.level = from
  }
  release() {
    if (this.stage < 3) this.stage = 3
  }
  /** Avanza `dt` segundos. Las etapas 0–2 suben/bajan; en 2 se queda (sustain). */
  step(rates: number[], levels: number[], dt: number, rateBoost: number) {
    if (this.stage >= 4) return this.level
    const target = levels[this.stage]
    const rate = rates[this.stage] + rateBoost
    if (this.level < target) {
      if (this.level < ATTACK_FLOOR) this.level = Math.min(target, ATTACK_FLOOR)
      this.level = Math.min(target, this.level + (99 / riseTime(rate)) * dt)
    } else this.level = Math.max(target, this.level - (99 / rateTime(rate)) * dt)
    if (this.level === target) {
      if (this.stage < 2) this.stage++
      else if (this.stage === 3) this.stage = 4
    }
    return this.level
  }
}

class Voice {
  note = -1
  velocity = 100
  gate = false
  active = false
  age = 0
  phase = new Float64Array(6)
  prev = new Float32Array(6) // salida de la muestra anterior (para feedback)
  fb1 = 0
  fb2 = 0
  egs = Array.from({ length: 6 }, () => new Eg())
  peg = new Eg()
  ampFrom = new Float32Array(6)
  ampTo = new Float32Array(6)
  inc = new Float64Array(6)
  adsr = 0
  adsrStage: 'a' | 'd' | 'r' | 'off' = 'off'
  adsrFrom = 0
  lfoTime = 0
}

class FmProcessor extends AudioWorkletProcessor {
  patch: Patch | null = null
  voices = Array.from({ length: MAX_VOICES }, () => new Voice())
  mono = false
  monoStack: number[] = []
  lfoPhase = 0
  lfoSH = 0
  lfoLast = 0
  clock = 0
  // derivado del algoritmo
  modsOf: number[][] = [[], [], [], [], [], []]
  carriers: number[] = []
  fbTo = 5
  fbFrom = 5

  constructor() {
    super()
    this.port.onmessage = (e: MessageEvent<WorkletMsg>) => this.onMessage(e.data)
  }

  onMessage(m: WorkletMsg) {
    switch (m.type) {
      case 'patch': {
        this.patch = m.patch
        const a = ALGORITHMS[m.patch.algorithm]
        this.modsOf = [0, 1, 2, 3, 4, 5].map((op) => a.mods.filter(([, t]) => t === op + 1).map(([f]) => f - 1))
        this.carriers = a.carriers.map((c) => c - 1)
        this.fbTo = a.fb[0] - 1
        this.fbFrom = a.fb[1] - 1
        break
      }
      case 'on':
        this.noteOn(m.note, m.velocity)
        break
      case 'off':
        this.noteOff(m.note)
        break
      case 'mono':
        this.mono = m.mono
        this.voices.forEach((v) => this.release(v))
        this.monoStack = []
        break
      case 'panic':
        this.voices.forEach((v) => (v.active = false))
        this.monoStack = []
    }
  }

  trigger(v: Voice, note: number, velocity: number, retrigger: boolean) {
    const p = this.patch
    if (!p) return
    v.note = note
    v.velocity = velocity
    v.gate = true
    v.age = this.clock++
    if (retrigger || !v.active) {
      for (let i = 0; i < 6; i++) {
        v.egs[i].start(v.active ? v.egs[i].level : p.ops[i].levels[3])
        if (p.oscSync || !v.active) v.phase[i] = 0
        if (!v.active) v.ampFrom[i] = 0
      }
      v.peg.start(p.pitchEnv.levels[3])
      v.adsrStage = 'a'
      v.adsrFrom = v.active ? v.adsr : 0
      if (!v.active) v.adsr = 0
      v.lfoTime = 0
      if (p.lfo.sync) this.lfoPhase = 0
    }
    v.active = true
  }

  release(v: Voice) {
    if (!v.active || !v.gate) return
    v.gate = false
    v.egs.forEach((e) => e.release())
    v.peg.release()
    v.adsrStage = 'r'
  }

  noteOn(note: number, velocity: number) {
    if (this.mono) {
      this.monoStack = this.monoStack.filter((n) => n !== note)
      this.monoStack.push(note)
      const v = this.voices[0]
      this.trigger(v, note, velocity, !v.gate) // legato: sin redisparar si ya hay nota
      return
    }
    // reusa la voz de la misma nota, una libre, o roba la más vieja
    let v = this.voices.find((x) => x.active && x.note === note)
      ?? this.voices.find((x) => !x.active)
      ?? this.voices.reduce((a, b) => (a.age < b.age ? a : b))
    this.trigger(v, note, velocity, true)
  }

  noteOff(note: number) {
    if (this.mono) {
      this.monoStack = this.monoStack.filter((n) => n !== note)
      const v = this.voices[0]
      if (v.note !== note) return
      const back = this.monoStack[this.monoStack.length - 1]
      if (back !== undefined) this.trigger(v, back, v.velocity, false)
      else this.release(v)
      return
    }
    this.voices.forEach((v) => v.note === note && v.gate && this.release(v))
  }

  lfoValue(p: Patch): number {
    const ph = this.lfoPhase
    switch (p.lfo.wave) {
      case 0: return 1 - 4 * Math.abs(ph - 0.5) // triángulo
      case 1: return 1 - 2 * ph // diente bajando
      case 2: return 2 * ph - 1 // diente subiendo
      case 3: return ph < 0.5 ? 1 : -1
      case 4: return Math.sin(TWO_PI * ph)
      default: return this.lfoSH
    }
  }

  process(_in: Float32Array[][], outputs: Float32Array[][]) {
    const out = outputs[0]
    const L = out[0]
    const R = out[1] ?? out[0]
    L.fill(0)
    const p = this.patch
    if (!p) {
      if (R !== L) R.fill(0)
      return true
    }

    const dt = BLOCK / sampleRate
    // LFO global
    const lfoInc = lfoHz(p.lfo.speed) * dt
    this.lfoPhase += lfoInc
    if (this.lfoPhase >= 1) {
      this.lfoPhase -= Math.floor(this.lfoPhase)
      this.lfoSH = Math.random() * 2 - 1
    }
    const lfo = this.lfoValue(p)
    const lfoUni = (lfo + 1) / 2

    const transpose = p.transpose - 24
    const fbScale = p.feedback ? Math.PI * Math.pow(2, p.feedback - 7) : 0
    const nCar = this.carriers.length
    const carScale = 0.32 / Math.pow(nCar, 0.5)
    const adsrS = p.env.s / 8

    for (const v of this.voices) {
      if (!v.active) continue

      // ── control por bloque ────────────────────────────────────────────
      v.lfoTime += dt
      const lfoDelay = (p.lfo.delay / 99) * 4
      const lfoFade = lfoDelay > 0 ? Math.min(1, v.lfoTime / lfoDelay) : 1
      const pitchLfo = lfo * lfoFade * (p.lfo.pmd / 99) * PITCH_SENS[p.lfo.pitchSens]
      const pegLevel = v.peg.step(p.pitchEnv.rates, p.pitchEnv.levels, dt * 1.5, 0)
      const pitchSemis = transpose + pitchLfo + ((pegLevel - 50) / 50) * 24
      const baseHz = 440 * Math.pow(2, (v.note - 69 + pitchSemis) / 12)
      const keyRate = (v.note - 36) / 6

      let carriersAlive = false
      for (let i = 0; i < 6; i++) {
        const o = p.ops[i]
        const env = v.egs[i].step(o.rates, o.levels, dt, o.rateScale * keyRate)
        // escalado por teclado (breakpoint + curvas)
        const bpNote = o.bp + 21
        const below = v.note < bpNote
        const dist = Math.min(1, Math.abs(v.note - bpNote) / 36)
        const curve = below ? o.lCurve : o.rCurve
        const depth = below ? o.lDepth : o.rDepth
        const shaped = curve === 1 || curve === 3 ? dist * dist : dist
        const scale = (curve < 2 ? -1 : 1) * depth * shaped * 0.6
        const vel = o.velSens * (1 - v.velocity / 127) * 6
        const outLevel = Math.max(0, Math.min(99, o.level + scale - vel))
        let amp = levelAmp(env) * levelAmp(outLevel)
        amp *= 1 - lfoUni * lfoFade * (p.lfo.amd / 99) * AMP_SENS[o.ams]
        v.ampFrom[i] = v.ampTo[i]
        v.ampTo[i] = amp
        if (this.carriers.includes(i) && (v.egs[i].stage < 4 || env > 1)) carriersAlive = true

        const hz = o.fixed
          ? Math.pow(10, o.coarse % 4) * Math.pow(10, o.fine / 100)
          : baseHz * (o.coarse === 0 ? 0.5 : o.coarse) * (1 + o.fine / 100) * Math.pow(2, ((o.detune - 7) * 1.2) / 1200)
        v.inc[i] = hz / sampleRate
      }

      // ADSR global del FM-1 (ENV)
      const adsrFrom = v.adsr
      if (v.adsrStage === 'a') {
        v.adsr += dt / ADSR_A[p.env.a]
        if (v.adsr >= 1) {
          v.adsr = 1
          v.adsrStage = 'd'
        }
      } else if (v.adsrStage === 'd') {
        v.adsr = adsrS + (v.adsr - adsrS) * Math.exp(-dt / (ADSR_D[p.env.d] / 4))
      } else if (v.adsrStage === 'r') {
        v.adsr *= Math.exp(-dt / (ADSR_R[p.env.r] / 4))
      }
      const adsrTo = v.adsr

      // ── audio por muestra ─────────────────────────────────────────────
      const mods = this.modsOf
      const car = this.carriers
      const fbTo = this.fbTo
      const fbFrom = this.fbFrom
      const prev = v.prev
      const ph = v.phase
      const inc = v.inc
      for (let n = 0; n < BLOCK; n++) {
        const t = n / BLOCK
        for (let i = 5; i >= 0; i--) {
          let mod = 0
          const m = mods[i]
          for (let k = 0; k < m.length; k++) mod += prev[m[k]] * MOD_MAX
          if (i === fbTo) mod += (v.fb1 + v.fb2) * 0.5 * fbScale
          const amp = v.ampFrom[i] + (v.ampTo[i] - v.ampFrom[i]) * t
          prev[i] = sinCycles(ph[i] + mod / TWO_PI) * amp
          ph[i] += inc[i]
          if (ph[i] > 1e6) ph[i] -= Math.floor(ph[i])
        }
        v.fb2 = v.fb1
        v.fb1 = prev[fbFrom]
        let s = 0
        for (let k = 0; k < car.length; k++) s += prev[car[k]]
        L[n] += s * carScale * (adsrFrom + (adsrTo - adsrFrom) * t) * (v.velocity / 127 * 0.5 + 0.5)
      }

      if ((v.adsrStage === 'r' && v.adsr < 0.0005) || (!v.gate && !carriersAlive)) {
        v.active = false
        v.adsrStage = 'off'
      }
    }

    // limitador suave
    for (let n = 0; n < BLOCK; n++) L[n] = Math.tanh(L[n] * 1.1)
    if (R !== L) R.set(L)
    return true
  }
}

registerProcessor('fm1-synth', FmProcessor)

/** Grabadora: copia lo que entra y lo manda al hilo principal en bloques. */
class RecorderProcessor extends AudioWorkletProcessor {
  private on = false
  private bufL: Float32Array[] = []
  private bufR: Float32Array[] = []
  private frames = 0

  constructor() {
    super()
    this.port.onmessage = (e: MessageEvent<{ on: boolean }>) => {
      this.on = e.data.on
      if (!this.on) this.flush(true)
    }
  }

  private flush(done = false) {
    if (this.frames || done) this.port.postMessage({ l: this.bufL, r: this.bufR, done })
    this.bufL = []
    this.bufR = []
    this.frames = 0
  }

  process(inputs: Float32Array[][]) {
    const input = inputs[0]
    if (this.on && input && input.length) {
      this.bufL.push(input[0].slice())
      this.bufR.push((input[1] ?? input[0]).slice())
      this.frames += input[0].length
      if (this.frames >= 16384) this.flush()
    }
    return true
  }
}

registerProcessor('fm1-recorder', RecorderProcessor)

