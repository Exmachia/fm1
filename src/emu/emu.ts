// Corre un firmware de la comunidad DENTRO de nuestro aparato. El motor es
// fm1-emu de Joakim Eriksson (MIT, en public/emu): emula el chip del FM-1 en
// un AudioWorklet. Nosotros le mandamos teclas, perillas y el MASTER, y él nos
// devuelve el sonido, la pantalla (240×240 RGB565) y los LEDs.

import { create } from 'zustand'
import { EMU_SITE, HUB, type Firmware } from '../firmwares/catalog'
import type { ButtonId, KnobId } from '../device/layout'

export type EmuStatus = 'off' | 'loading' | 'booting' | 'running' | 'error'

interface EmuState {
  fw: Firmware | null
  status: EmuStatus
  error: string | null
  /** LEDs encendidos (id de la matriz → prendido), ya umbralizados. */
  leds: boolean[]
  pressed: Set<number>
  angles: Record<KnobId, number>
  master: number
}

const OFF_LEDS = Array.from({ length: 41 }, () => false)

export const useEmu = create<EmuState>(() => ({
  fw: null,
  status: 'off',
  error: null,
  leds: OFF_LEDS,
  pressed: new Set(),
  angles: { master: 0, select: 0, presets: 0, algorithm: 0, knob1: 0, knob2: 0, knob3: 0, knob4: 0 },
  master: 0.7,
}))

export const emuActive = () => useEmu.getState().status !== 'off'

// ── Mapa de controles (crates/fm1-live/src/panel.rs del emulador) ─────────
export const BUTTON_ID: Record<ButtonId, number> = {
  octDown: 0, octUp: 1, fx: 2, sel: 3, env: 4, lfo: 5, edit: 6, glo: 7,
  home: 8, save: 9, arp: 10, seq: 11, play: 12, rec: 13,
}
/** Las 27 teclas (F3…G5) son 14…40. */
export const keyId = (index: number) => 14 + index
const ENCODER: Partial<Record<KnobId, number>> = {
  select: 0, algorithm: 1, knob1: 2, knob2: 3, knob3: 4, knob4: 5, presets: 6,
}
/** Un clic de encoder gira 18° (como en el emulador). */
const DEG_PER_CLICK = 18
/** Fracción de tiempo encendido → LED prendido (el emulador usa f / 0.08). */
const LED_ON = 0.03

// ── Motor ─────────────────────────────────────────────────────────────────
let ctx: AudioContext | null = null
let node: AudioWorkletNode | null = null
let wasm: ArrayBuffer | null = null
let seq = 0
let lcd: Uint16Array | null = null
let lcdVersion = 0

/** Estado del audio del emulador (para depurar): contexto y si el firmware ya suena. */
let playing = false
export const emuAudio = () => ({ context: ctx?.state ?? 'none', playing })

/** Último cuadro de la pantalla del firmware (o null si aún no llega). */
export const readLcd = () => ({ lcd, version: lcdVersion })

const send = (m: Record<string, unknown>) => node?.port.postMessage(m)

const json = async <T,>(url: string): Promise<T | null> => {
  try {
    const r = await fetch(url, { cache: 'no-cache' })
    return r.ok ? ((await r.json()) as T) : null
  } catch {
    return null
  }
}

/**
 * Baja el paquete .fwsc: el que el Hub lista hoy (borra las versiones viejas
 * cuando sale una nueva); si no se puede, el que probó el emulador o el nuestro.
 */
async function fetchPackage(fw: Firmware): Promise<ArrayBuffer> {
  const [emuList, hubList] = await Promise.all([
    json<{ firmwares: { id: string; package?: string }[] }>(`${EMU_SITE}firmwares.json`),
    json<{ firmwares: { id: string; pkg?: string }[] }>(`${HUB}catalog.json`),
  ])
  const hubPkg = hubList?.firmwares.find((f) => f.id === fw.id)?.pkg
  const urls = [
    hubPkg && new URL(hubPkg, HUB).href,
    emuList?.firmwares.find((f) => f.id === fw.id)?.package,
    fw.package,
  ].filter((u, i, all): u is string => !!u && all.indexOf(u) === i)
  let status = 0
  for (const url of urls) {
    const r = await fetch(url).catch(() => null)
    if (r?.ok) return r.arrayBuffer()
    status = r?.status ?? 0
  }
  throw new Error(`No se pudo bajar ${fw.name}${status ? ` (${status})` : ''}`)
}

async function ensureAudio() {
  if (ctx && node) return
  // el emulador corre a 44.1 kHz, como el aparato
  ctx ??= new AudioContext({ sampleRate: 44100, latencyHint: 'interactive' })
  await ctx.audioWorklet.addModule(`${import.meta.env.BASE_URL}emu/worklet.js`)
  node = new AudioWorkletNode(ctx, 'fm1', { numberOfInputs: 0, outputChannelCount: [2] })
  node.connect(ctx.destination)
  node.port.onmessage = onMessage
}

/** Si en este tiempo no arranca, algo se trabó. */
const BOOT_TIMEOUT = 30000
let bootTimer: ReturnType<typeof setTimeout> | undefined

/** El error en palabras de aquí: qué pasó y qué hacer. */
function explain(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err)
  if (/failed to fetch|load failed|networkerror|unable to load|aborterror/i.test(msg) || (err instanceof DOMException && err.name === 'AbortError'))
    return 'No se pudo descargar el emulador. Revisa tu conexión o recarga la página.'
  return msg
}

function onMessage(e: MessageEvent) {
  const m = e.data as { type: string; seq?: number; lcd?: Uint16Array | null; leds?: Float32Array; message?: string; fatal?: boolean; playing?: boolean }
  if (m.seq !== undefined && m.seq !== seq) return
  if (m.type === 'booted') {
    clearTimeout(bootTimer)
    useEmu.setState({ status: 'running' })
  } else if (m.type === 'frame') {
    playing = !!m.playing
    if (m.lcd) {
      lcd = m.lcd
      lcdVersion++
    }
    if (m.leds) {
      const next = Array.from(m.leds, (f) => f > LED_ON)
      const prev = useEmu.getState().leds
      if (next.some((v, i) => v !== prev[i])) useEmu.setState({ leds: next })
    }
  } else if (m.type === 'error' && (m.fatal || useEmu.getState().status !== 'running')) {
    clearTimeout(bootTimer)
    console.error('[fm1-emu]', m.message)
    useEmu.setState({ status: 'error', error: m.message ? `El emulador dijo: ${m.message}` : 'El firmware se detuvo' })
  }
}

/** Arranca un firmware. Llamar desde un clic: el navegador solo deja sonar después de uno. */
export async function startFirmware(fw: Firmware) {
  const my = ++seq
  clearTimeout(bootTimer)
  lcd = null
  lcdVersion++
  useEmu.setState({ fw, status: 'loading', error: null, leds: OFF_LEDS, pressed: new Set() })
  try {
    const audio = ensureAudio()
    void ctx?.resume()
    const [pkg, bin] = await Promise.all([
      fetchPackage(fw),
      wasm ? Promise.resolve(wasm) : fetch(`${import.meta.env.BASE_URL}emu/fm1_web.wasm`).then((r) => r.arrayBuffer()),
      audio,
    ])
    wasm = bin
    if (my !== seq) return
    useEmu.setState({ status: 'booting' })
    await ctx?.resume()
    send({ type: 'boot', seq: my, wasm: bin.slice(0), package: pkg, mhz: 100, jit: true })
    // el MASTER del emulador arranca donde esté nuestra perilla
    send({ type: 'pot', value: Math.round(useEmu.getState().master * 1023) })
    bootTimer = setTimeout(() => {
      if (my !== seq || useEmu.getState().status !== 'booting') return
      send({ type: 'cancel-boot', seq: my })
      useEmu.setState({ status: 'error', error: 'Tardó demasiado en arrancar. Inténtalo otra vez.' })
    }, BOOT_TIMEOUT)
  } catch (err) {
    if (my !== seq) return
    console.error('[fm1-emu]', err)
    useEmu.setState({ status: 'error', error: explain(err) })
  }
}

/** Regresa al FM-1 de fábrica (nuestro motor). */
export function stopFirmware() {
  seq++
  clearTimeout(bootTimer)
  send({ type: 'cancel-boot', seq })
  void ctx?.suspend()
  lcd = null
  useEmu.setState({ fw: null, status: 'off', error: null, leds: OFF_LEDS, pressed: new Set() })
}

// ── Entradas ──────────────────────────────────────────────────────────────
export function emuKey(id: number, down: boolean) {
  const pressed = new Set(useEmu.getState().pressed)
  if (down === pressed.has(id)) return
  if (down) pressed.add(id)
  else pressed.delete(id)
  useEmu.setState({ pressed })
  send({ type: 'key', id, down })
}

export function emuTurn(knob: KnobId, clicks: number) {
  const s = useEmu.getState()
  if (knob === 'master') {
    const master = Math.min(1, Math.max(0, s.master + clicks * 0.02))
    useEmu.setState({ master })
    send({ type: 'pot', value: Math.round(master * 1023) })
    return
  }
  const enc = ENCODER[knob]
  if (enc === undefined) return
  useEmu.setState({ angles: { ...s.angles, [knob]: s.angles[knob] + clicks * DEG_PER_CLICK } })
  send({ type: 'enc', enc, clicks })
}

/** Bytes MIDI crudos al jack MIDI IN del aparato emulado. */
export const emuMidi = (bytes: number[]) => send({ type: 'midi', bytes })
