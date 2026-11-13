// Exporta voces como banco SysEx de DX7 (32 voces, formato "packed"). Lo
// abren Dexed, cualquier DX7 y el FM-1 original (que importa bancos de DX7).
// Los efectos y el ADSR global son del FM-1: no existen en el DX7 y no viajan.

import { makeOp, makePatch, type Patch } from './patch'

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v) || 0))

/** 128 bytes de una voz en el formato de banco del DX7. */
function packVoice(p: Patch): number[] {
  const out: number[] = []
  // en el SysEx el operador 6 va primero
  for (let i = 5; i >= 0; i--) {
    const o = p.ops[i] ?? makeOp()
    for (let k = 0; k < 4; k++) out.push(clamp(o.rates[k], 0, 99))
    for (let k = 0; k < 4; k++) out.push(clamp(o.levels[k], 0, 99))
    out.push(clamp(o.bp, 0, 99), clamp(o.lDepth, 0, 99), clamp(o.rDepth, 0, 99))
    out.push((clamp(o.rCurve, 0, 3) << 2) | clamp(o.lCurve, 0, 3))
    out.push((clamp(o.detune, 0, 14) << 3) | clamp(o.rateScale, 0, 7))
    out.push((clamp(o.velSens, 0, 7) << 2) | clamp(o.ams, 0, 3))
    out.push(clamp(o.level, 0, 99))
    out.push((clamp(o.coarse, 0, 31) << 1) | (o.fixed ? 1 : 0))
    out.push(clamp(o.fine, 0, 99))
  }
  for (let k = 0; k < 4; k++) out.push(clamp(p.pitchEnv.rates[k], 0, 99))
  for (let k = 0; k < 4; k++) out.push(clamp(p.pitchEnv.levels[k], 0, 99))
  out.push(clamp(p.algorithm, 0, 31))
  out.push(((p.oscSync ? 1 : 0) << 3) | clamp(p.feedback, 0, 7))
  out.push(clamp(p.lfo.speed, 0, 99), clamp(p.lfo.delay, 0, 99), clamp(p.lfo.pmd, 0, 99), clamp(p.lfo.amd, 0, 99))
  out.push((clamp(p.lfo.pitchSens, 0, 7) << 4) | (clamp(p.lfo.wave, 0, 5) << 1) | (p.lfo.sync ? 1 : 0))
  out.push(clamp(p.transpose, 0, 48))
  const name = p.name.toUpperCase().replace(/[^\x20-\x7e]/g, ' ').padEnd(10).slice(0, 10)
  for (const ch of name) out.push(ch.charCodeAt(0))
  return out
}

/** Banco de 32 voces; si das menos, el resto queda como INIT VOICE. */
export function dx7Bank(patches: Patch[]): Uint8Array {
  const voices = Array.from({ length: 32 }, (_, i) =>
    patches[i] ?? makePatch({ ops: [makeOp({ level: 99 }), ...Array.from({ length: 5 }, () => makeOp())] }),
  )
  const data = voices.flatMap(packVoice)
  const sum = data.reduce((a, b) => a + b, 0)
  const checksum = (128 - (sum & 0x7f)) & 0x7f
  return new Uint8Array([0xf0, 0x43, 0x00, 0x09, 0x20, 0x00, ...data, checksum, 0xf7])
}

/** Baja un archivo generado aquí mismo (no sale nada de tu computadora). */
export function download(bytes: Uint8Array | Blob, filename: string, type = 'application/octet-stream') {
  const blob = bytes instanceof Blob ? bytes : new Blob([bytes], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}

export const safeName = (s: string) => s.trim().replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').toLowerCase() || 'fm1'
