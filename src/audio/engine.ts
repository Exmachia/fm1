// Conecta el firmware con el audio: crea el AudioContext con el primer toque
// (los navegadores no dejan sonar antes), carga el motor FM, arma la cadena
// de efectos y escucha los cambios de la voz, el volumen y las notas.

import workletUrl from './fm-worklet.ts?worker&url'
import { createFxChain } from './fx'
import { onNote, useFM1 } from '../fm1/store'
import type { WorkletMsg } from './fm-worklet'

let ctx: AudioContext | null = null
let node: AudioWorkletNode | null = null
let analyser: AnalyserNode | null = null
let scope: Float32Array | null = null
let starting: Promise<void> | null = null
let recorder: AudioWorkletNode | null = null
const pending: WorkletMsg[] = []

const send = (m: WorkletMsg) => (node ? node.port.postMessage(m) : pending.push(m))

// Las notas se escuchan desde ya: si llegan antes de que el motor cargue,
// se guardan y se mandan en cuanto esté listo (así suena el primer toque).
onNote((e) => {
  if (!ctx) return
  send(e.on ? { type: 'on', note: e.note, velocity: e.velocity } : { type: 'off', note: e.note })
})

export function startAudio(): Promise<void> {
  if (starting) return starting
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  ctx = new AC({ latencyHint: 'interactive' })
  const c = ctx
  void c.resume()

  starting = (async () => {
    await c.audioWorklet.addModule(workletUrl)
    const synth = new AudioWorkletNode(c, 'fm1-synth', { numberOfInputs: 0, outputChannelCount: [2] })
    const master = c.createGain()
    analyser = c.createAnalyser()
    analyser.fftSize = 2048
    scope = new Float32Array(analyser.fftSize)
    master.connect(analyser)
    analyser.connect(c.destination)
    // la grabadora escucha lo mismo que sale por las bocinas (con efectos)
    recorder = new AudioWorkletNode(c, 'fm1-recorder', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [2] })
    const mute = c.createGain()
    mute.gain.value = 0
    master.connect(recorder)
    recorder.connect(mute).connect(c.destination)
    const fx = createFxChain(c, synth, master)

    const s0 = useFM1.getState()
    synth.port.postMessage({ type: 'patch', patch: s0.patch } satisfies WorkletMsg)
    synth.port.postMessage({ type: 'mono', mono: s0.voiceMode === 'mono' } satisfies WorkletMsg)
    fx.apply(s0.patch.fx)
    master.gain.value = volume(s0.master)

    node = synth
    pending.splice(0).forEach((m) => synth.port.postMessage(m))

    useFM1.subscribe((s, prev) => {
      if (s.patch !== prev.patch) {
        synth.port.postMessage({ type: 'patch', patch: s.patch } satisfies WorkletMsg)
        if (s.patch.fx !== prev.patch.fx) fx.apply(s.patch.fx)
      }
      if (s.master !== prev.master) master.gain.setTargetAtTime(volume(s.master), c.currentTime, 0.02)
      if (s.voiceMode !== prev.voiceMode) synth.port.postMessage({ type: 'mono', mono: s.voiceMode === 'mono' } satisfies WorkletMsg)
    })
  })()
  return starting
}

const volume = (m: number) => m * m * 1.4

export const audioRunning = () => !!node && ctx?.state === 'running'

/** Últimas ~43 ms de la salida, para el osciloscopio de la pantalla HOME. */
export function readScope(): Float32Array | null {
  if (!analyser || !scope || !audioRunning()) return null
  analyser.getFloatTimeDomainData(scope)
  return scope
}

/** Arranca el audio con el primer gesto del usuario en cualquier parte. */
export function armAudioOnFirstGesture() {
  const go = () => {
    void startAudio()
    window.removeEventListener('pointerdown', go, true)
    window.removeEventListener('keydown', go, true)
  }
  window.addEventListener('pointerdown', go, true)
  window.addEventListener('keydown', go, true)
}


// ── Grabar a WAV ──────────────────────────────────────────────────────────
let chunks: { l: Float32Array[]; r: Float32Array[] } = { l: [], r: [] }

export async function startRecording() {
  await startAudio()
  if (!recorder) throw new Error('El audio no arrancó')
  chunks = { l: [], r: [] }
  recorder.port.onmessage = (e: MessageEvent<{ l: Float32Array[]; r: Float32Array[]; done: boolean }>) => {
    chunks.l.push(...e.data.l)
    chunks.r.push(...e.data.r)
  }
  recorder.port.postMessage({ on: true })
}

/** Detiene la grabación y devuelve un WAV estéreo de 24 bits. */
export function stopRecording(): Promise<Blob | null> {
  const rec = recorder
  if (!rec || !ctx) return Promise.resolve(null)
  const rate = ctx.sampleRate
  return new Promise((resolve) => {
    rec.port.onmessage = (e: MessageEvent<{ l: Float32Array[]; r: Float32Array[]; done: boolean }>) => {
      chunks.l.push(...e.data.l)
      chunks.r.push(...e.data.r)
      if (!e.data.done) return
      rec.port.onmessage = null
      resolve(chunks.l.length ? encodeWav(chunks.l, chunks.r, rate) : null)
    }
    rec.port.postMessage({ on: false })
  })
}

function encodeWav(l: Float32Array[], r: Float32Array[], rate: number): Blob {
  const frames = l.reduce((n, c) => n + c.length, 0)
  const bytes = 3
  const data = frames * 2 * bytes
  const buf = new ArrayBuffer(44 + data)
  const v = new DataView(buf)
  const str = (o: number, s: string) => [...s].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)))
  str(0, 'RIFF')
  v.setUint32(4, 36 + data, true)
  str(8, 'WAVE')
  str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true) // PCM
  v.setUint16(22, 2, true)
  v.setUint32(24, rate, true)
  v.setUint32(28, rate * 2 * bytes, true)
  v.setUint16(32, 2 * bytes, true)
  v.setUint16(34, 8 * bytes, true)
  str(36, 'data')
  v.setUint32(40, data, true)
  let o = 44
  const put = (x: number) => {
    const s = Math.round(Math.max(-1, Math.min(1, x)) * 8388607)
    v.setUint8(o, s & 0xff)
    v.setUint8(o + 1, (s >> 8) & 0xff)
    v.setUint8(o + 2, (s >> 16) & 0xff)
    o += 3
  }
  l.forEach((cl, ci) => {
    const cr = r[ci]
    for (let i = 0; i < cl.length; i++) {
      put(cl[i])
      put(cr[i])
    }
  })
  return new Blob([buf], { type: 'audio/wav' })
}
