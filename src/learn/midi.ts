// Lector de archivos MIDI estándar (.mid, formatos 0 y 1) y conversión a
// lección: agrupa las notas que empiezan juntas, las acomoda en el rango del
// FM-1 y las parte en frases cortas.

import { BASE_NOTE, KEYS } from '../device/layout'
import type { DemoEvent, Lesson, Step } from './lesson'

export interface MidiNote { note: number; t: number; d: number }
export interface MidiTrack { name: string; notes: MidiNote[] }

export function parseMidi(buf: ArrayBuffer): MidiTrack[] {
  const v = new DataView(buf)
  let p = 0
  const need = (n: number) => {
    if (p + n > v.byteLength) throw new Error('El archivo se corta antes de tiempo')
  }
  const u8 = () => (need(1), v.getUint8(p++))
  const u16 = () => (need(2), (p += 2), v.getUint16(p - 2))
  const u32 = () => (need(4), (p += 4), v.getUint32(p - 4))
  const tag = () => String.fromCharCode(u8(), u8(), u8(), u8())
  const vlq = () => {
    let n = 0
    for (let i = 0; i < 4; i++) {
      const b = u8()
      n = (n << 7) | (b & 0x7f)
      if (!(b & 0x80)) return n
    }
    return n
  }

  if (v.byteLength < 14 || tag() !== 'MThd') throw new Error('No es un archivo MIDI')
  const hlen = u32()
  u16() // formato
  const ntrks = u16()
  const division = u16()
  p = 8 + hlen

  // SMPTE: ticks por segundo fijos; si no, ticks por negra con mapa de tempo
  const smpte = division & 0x8000 ? (256 - (division >> 8)) * (division & 0xff) : 0
  const tempos: { tick: number; us: number }[] = []
  type Raw = { name: string; notes: { note: number; on: number; off: number; ch: number }[] }
  const raws: Raw[] = []

  for (let t = 0; t < ntrks && p + 8 <= v.byteLength; t++) {
    const id = tag()
    const len = u32()
    const end = Math.min(v.byteLength, p + len)
    if (id !== 'MTrk') {
      p = end
      continue
    }
    const raw: Raw = { name: '', notes: [] }
    const open = new Map<number, number[]>()
    let tick = 0
    let status = 0
    while (p < end) {
      tick += vlq()
      let b = u8()
      if (b < 0x80) {
        // running status: el byte ya es el primer dato
        b = status
        p--
      }
      if (b === 0xff) {
        const type = u8()
        const l = vlq()
        need(l)
        if (type === 0x51 && l === 3) tempos.push({ tick, us: (v.getUint8(p) << 16) | (v.getUint8(p + 1) << 8) | v.getUint8(p + 2) })
        if (type === 0x03 && !raw.name) raw.name = new TextDecoder('latin1').decode(new Uint8Array(buf, p, l)).trim()
        p += l
        if (type === 0x2f) break
        continue
      }
      if (b === 0xf0 || b === 0xf7) {
        p += vlq()
        continue
      }
      status = b
      const cmd = b & 0xf0
      const ch = b & 0x0f
      const d1 = u8()
      const d2 = cmd === 0xc0 || cmd === 0xd0 ? 0 : u8()
      const key = ch * 128 + d1
      if (cmd === 0x90 && d2 > 0) {
        const stack = open.get(key) ?? []
        stack.push(tick)
        open.set(key, stack)
      } else if (cmd === 0x80 || (cmd === 0x90 && d2 === 0)) {
        const on = open.get(key)?.shift()
        if (on !== undefined) raw.notes.push({ note: d1, on, off: tick, ch })
      }
    }
    p = end
    raws.push(raw)
  }

  // ticks → segundos
  tempos.sort((a, b) => a.tick - b.tick)
  const ppq = division & 0x7fff || 480
  const seconds = (tick: number) => {
    if (smpte) return tick / smpte
    let s = 0
    let last = 0
    let us = 500000
    for (const tp of tempos) {
      if (tp.tick >= tick) break
      s += ((tp.tick - last) * us) / ppq / 1e6
      last = tp.tick
      us = tp.us
    }
    return s + ((tick - last) * us) / ppq / 1e6
  }

  return raws
    .map((r, i) => ({
      name: r.name || `Pista ${i + 1}`,
      // el canal 10 es batería: no tiene notas que tocar
      notes: r.notes
        .filter((n) => n.ch !== 9)
        .map((n) => ({ note: n.note, t: seconds(n.on), d: Math.max(0.05, seconds(n.off) - seconds(n.on)) }))
        .sort((a, b) => a.t - b.t || a.note - b.note),
    }))
    .filter((tr) => tr.notes.length > 0)
}

// ── De notas a lección ──────────────────────────────────────────────────

/** Un momento de la canción: lo que se toca junto. */
export interface Moment { t: number; d: number; notes: number[] }

export interface Song {
  id: string
  title: string
  moments: Moment[]
}

const LOW = BASE_NOTE
const HIGH = BASE_NOTE + KEYS.length - 1
const CHORD_WINDOW = 0.04
const MAX_MOMENTS = 400

export function songFromNotes(title: string, notes: MidiNote[], melodyOnly: boolean): Song {
  const sorted = [...notes].sort((a, b) => a.t - b.t)
  const moments: Moment[] = []
  for (const n of sorted) {
    const m = moments[moments.length - 1]
    if (m && n.t - m.t < CHORD_WINDOW) {
      m.notes.push(n.note)
      m.d = Math.max(m.d, n.d)
    } else moments.push({ t: n.t, d: n.d, notes: [n.note] })
  }

  // la octava que deja más notas dentro de las 27 teclas, sin mover el tono
  const all = moments.flatMap((m) => m.notes)
  let shift = 0
  let best = -1
  for (let k = -4; k <= 4; k++) {
    const inside = all.filter((n) => n + 12 * k >= LOW && n + 12 * k <= HIGH).length
    if (inside > best || (inside === best && Math.abs(k) < Math.abs(shift))) [best, shift] = [inside, k]
  }
  const fold = (n: number) => {
    let x = n + 12 * shift
    while (x < LOW) x += 12
    while (x > HIGH) x -= 12
    return x
  }

  const start = moments[0]?.t ?? 0
  const out = moments.slice(0, MAX_MOMENTS).map((m) => {
    let ns = [...new Set(m.notes.map(fold))].sort((a, b) => a - b)
    // solo melodía: la nota más aguda; acordes: hasta 4 notas (las más agudas)
    ns = melodyOnly ? [ns[ns.length - 1]] : ns.slice(-4)
    return { t: m.t - start, d: m.d, notes: ns }
  })
  // si dos momentos seguidos quedaron iguales por el filtro, se tocan dos veces (está bien)
  return { id: `midi-${Date.now().toString(36)}`, title, moments: out }
}

const PHRASE = 8
const MAX_GAP = 1.6

/** Demo con los tiempos reales, sin silencios larguísimos. */
function momentsDemo(ms: Moment[]): DemoEvent[] {
  const out: DemoEvent[] = []
  let t = 0
  ms.forEach((m, i) => {
    if (i > 0) t += Math.min(MAX_GAP, Math.max(0.08, m.t - ms[i - 1].t))
    m.notes.forEach((note) => out.push({ t: t * 1000, note, d: Math.min(m.d, 2) * 1000 }))
  })
  return out
}

export function lessonFromSong(song: Song): Lesson {
  const phrases: Moment[][] = []
  for (let i = 0; i < song.moments.length; i += PHRASE) phrases.push(song.moments.slice(i, i + PHRASE))
  const chords = song.moments.some((m) => m.notes.length > 1)

  const steps: Step[] = [
    {
      title: song.title,
      body: `La convertí en ${phrases.length} ${phrases.length === 1 ? 'frase' : 'frases'} cortas. En cada una te ilumino la tecla que sigue${chords ? ' (o todas las del acorde)' : ''} y esperas a tocarla, sin prisa. Escúchala primero.`,
      demo: momentsDemo(song.moments.slice(0, 32)),
    },
    ...phrases.map<Step>((ph, i) => ({
      title: `Frase ${i + 1} de ${phrases.length}`,
      body: i === 0 ? 'Escúchala y luego tócala. Si una nota no cabe en el teclado, el aro te señala OCT− u OCT+.' : 'Sigue igual: escucha y toca las teclas azules.',
      task: 'Toca las teclas azules',
      follow: ph.map((m) => m.notes),
      demo: momentsDemo(ph),
    })),
  ]
  if (phrases.length > 1 && song.moments.length <= 64) {
    steps.push({
      title: 'Toda junta',
      body: 'Ahora de corrido. Escúchala otra vez si quieres.',
      task: 'Toca las teclas azules',
      follow: song.moments.map((m) => m.notes),
      demo: momentsDemo(song.moments),
    })
  }
  steps.push({
    title: '¡La tocaste!',
    body: 'Repítela las veces que quieras. Prueba otros presets: la misma canción cambia mucho con otro sonido.',
  })

  return { id: song.id, title: song.title, subtitle: `Importada de MIDI · ${song.moments.length} notas`, steps }
}

// ── Canciones importadas guardadas en el navegador ──────────────────────
const SONGS_KEY = 'fm1.songs.v1'

export const loadSongs = (): Song[] => {
  try {
    const raw = localStorage.getItem(SONGS_KEY)
    return raw ? (JSON.parse(raw) as Song[]) : []
  } catch {
    return []
  }
}
export const saveSongs = (songs: Song[]) => {
  try {
    localStorage.setItem(SONGS_KEY, JSON.stringify(songs))
  } catch {
    /* sin almacenamiento: la canción dura mientras no recargues */
  }
}

