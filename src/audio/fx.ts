// Los 6 efectos del FM-1 con nodos de Web Audio. Cada efecto tiene una
// entrada y una salida; apagado = pasa la señal limpia. El orden de la cadena
// se puede cambiar (SEL + SELECT) y se reconecta en vivo.

import { cutoffHz, type FxChain, type FxId, type FxUnit } from '../fm1/patch'

export interface FxNode {
  input: GainNode
  output: GainNode
  update: (u: FxUnit) => void
}

const T = 0.03 // segundos para suavizar cada cambio de parámetro

function shell(ctx: AudioContext) {
  const input = ctx.createGain()
  const output = ctx.createGain()
  const dry = ctx.createGain()
  const wet = ctx.createGain()
  input.connect(dry).connect(output)
  wet.connect(output)
  const mix = (on: boolean, wetAmt: number, dryAmt = 1) => {
    const now = ctx.currentTime
    wet.gain.setTargetAtTime(on ? wetAmt : 0, now, T)
    dry.gain.setTargetAtTime(on ? dryAmt : 1, now, T)
  }
  return { input, output, wet, mix }
}

function filter(ctx: AudioContext): FxNode {
  const s = shell(ctx)
  const f = ctx.createBiquadFilter()
  s.input.connect(f).connect(s.wet)
  const types: BiquadFilterType[] = ['lowpass', 'bandpass', 'highpass']
  return {
    ...s,
    update: (u) => {
      f.type = types[u.type]
      f.frequency.setTargetAtTime(cutoffHz(u.p[0]), ctx.currentTime, T)
      f.Q.setTargetAtTime(0.5 * Math.pow(40, u.p[1] / 100), ctx.currentTime, T)
      s.mix(u.on, 1, 0)
    },
  }
}

/** Respuesta al impulso sintética: ruido estéreo que se apaga. */
function impulse(ctx: AudioContext, seconds: number, bright: boolean) {
  const len = Math.max(1, Math.floor(seconds * ctx.sampleRate))
  const buf = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c)
    let lp = 0
    for (let i = 0; i < len; i++) {
      const env = Math.pow(1 - i / len, bright ? 2.2 : 3)
      const n = Math.random() * 2 - 1
      lp = bright ? n : lp + (n - lp) * 0.35 // la sala y el hall son más oscuros
      d[i] = lp * env
    }
  }
  return buf
}

function reverb(ctx: AudioContext): FxNode {
  const s = shell(ctx)
  const conv = ctx.createConvolver()
  s.input.connect(conv).connect(s.wet)
  let key = ''
  const BASE = [0.9, 2.8, 1.8] // Room, Hall, Plate
  return {
    ...s,
    update: (u) => {
      const seconds = BASE[u.type] * (0.3 + (u.p[0] / 100) * 1.7)
      const k = `${u.type}:${u.p[0]}`
      if (k !== key) {
        key = k
        conv.buffer = impulse(ctx, seconds, u.type === 2)
      }
      s.mix(u.on, (u.p[1] / 100) * 0.9)
    },
  }
}

function delay(ctx: AudioContext): FxNode {
  const s = shell(ctx)
  const d = ctx.createDelay(1.5)
  const fb = ctx.createGain()
  const tone = ctx.createBiquadFilter()
  tone.frequency.value = 6000
  s.input.connect(d)
  d.connect(tone).connect(fb).connect(d)
  d.connect(s.wet)
  return {
    ...s,
    update: (u) => {
      const now = ctx.currentTime
      fb.gain.setTargetAtTime((u.p[0] / 100) * 0.85, now, T)
      d.delayTime.setTargetAtTime(0.06 + (u.p[1] / 100) * 0.94, now, 0.08)
      s.mix(u.on, u.p[2] / 100)
    },
  }
}

function distortion(ctx: AudioContext): FxNode {
  const s = shell(ctx)
  const pre = ctx.createGain()
  const shaper = ctx.createWaveShaper()
  const tone = ctx.createBiquadFilter()
  const level = ctx.createGain()
  const curve = new Float32Array(2048)
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / (curve.length - 1)) * 2 - 1) * 3)
  shaper.curve = curve
  shaper.oversample = '4x'
  s.input.connect(pre).connect(shaper).connect(tone).connect(level).connect(s.wet)
  return {
    ...s,
    update: (u) => {
      const now = ctx.currentTime
      const drive = 1 + (u.p[0] / 100) * 30
      pre.gain.setTargetAtTime(drive, now, T)
      tone.frequency.setTargetAtTime(800 + (u.p[1] / 100) * 11000, now, T)
      level.gain.setTargetAtTime(((u.p[2] / 100) * 1.1) / Math.sqrt(drive), now, T)
      s.mix(u.on, 1, 0)
    },
  }
}

function lfo(ctx: AudioContext) {
  const osc = ctx.createOscillator()
  const depth = ctx.createGain()
  osc.connect(depth)
  osc.start()
  return { osc, depth }
}

function chorus(ctx: AudioContext): FxNode {
  const s = shell(ctx)
  const d = ctx.createDelay(0.05)
  d.delayTime.value = 0.014
  const { osc, depth } = lfo(ctx)
  depth.connect(d.delayTime)
  s.input.connect(d).connect(s.wet)
  return {
    ...s,
    update: (u) => {
      const now = ctx.currentTime
      osc.frequency.setTargetAtTime(0.1 + (u.p[0] / 100) * 4.9, now, T)
      depth.gain.setTargetAtTime((u.p[1] / 100) * 0.006, now, T)
      s.mix(u.on, u.p[2] / 100, 1 - u.p[2] / 200)
    },
  }
}

function phaser(ctx: AudioContext): FxNode {
  const s = shell(ctx)
  const stages = Array.from({ length: 6 }, () => {
    const f = ctx.createBiquadFilter()
    f.type = 'allpass'
    f.frequency.value = 700
    f.Q.value = 0.7
    return f
  })
  const { osc, depth } = lfo(ctx)
  stages.forEach((f) => depth.connect(f.frequency))
  stages.reduce<AudioNode>((prev, f) => prev.connect(f), s.input).connect(s.wet)
  return {
    ...s,
    update: (u) => {
      const now = ctx.currentTime
      osc.frequency.setTargetAtTime(0.05 + (u.p[0] / 100) * 4, now, T)
      depth.gain.setTargetAtTime(100 + (u.p[1] / 100) * 600, now, T)
      s.mix(u.on, u.p[2] / 100, 1 - u.p[2] / 200)
    },
  }
}

const MAKERS: Record<FxId, (ctx: AudioContext) => FxNode> = { filter, reverb, delay, distortion, chorus, phaser }

/** Cadena completa: source → efectos (en el orden de la voz) → destino. */
export function createFxChain(ctx: AudioContext, source: AudioNode, destination: AudioNode) {
  const nodes = Object.fromEntries(
    (Object.keys(MAKERS) as FxId[]).map((id) => [id, MAKERS[id](ctx)]),
  ) as Record<FxId, FxNode>
  let order = ''

  const connect = (ids: FxId[]) => {
    source.disconnect()
    ids.forEach((id) => nodes[id].output.disconnect())
    let prev: AudioNode = source
    for (const id of ids) {
      prev.connect(nodes[id].input)
      prev = nodes[id].output
    }
    prev.connect(destination)
  }

  return {
    apply(fx: FxChain) {
      const key = fx.order.join(',')
      if (key !== order) {
        order = key
        connect(fx.order)
      }
      for (const id of fx.order) nodes[id].update(fx.units[id])
    },
  }
}
