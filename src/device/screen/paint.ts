// Dibuja la TFT de 240×240 a partir del estado del firmware.
// Zonas (manual pág. 3): barra superior (voz + batería), centro (contenido del
// modo) y barra inferior (modo y página, o el valor que estás moviendo).

import type { FM1State } from '../../fm1/store'
import { pagesFor, modeLabel, fmtParam, type ParamDef } from '../../fm1/params'
import { FX_NAMES } from '../../fm1/patch'
import { ALGORITHMS, layoutAlgorithm } from '../../fm1/algorithms'
import { readScope } from '../../audio/engine'

export const LCD = 240
const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif'
const INK = '#111'
const BOX = '#c4c7cb'
const BOX_ON = '#9ea2a7'
const EDGE = '#5d6166'
const RED = '#e0242c'
const CENTER = { x: 8, y: 46, w: 224, h: 144 }

type Ctx = CanvasRenderingContext2D

export function paintScreen(ctx: Ctx, s: FM1State, now: number) {
  paintBackground(ctx)
  paintTopBar(ctx, `${String(s.presetIndex + 1).padStart(3, '0')} ${s.patch.name}`)

  if (s.confirmReset) paintConfirmReset(ctx)
  else {
    switch (s.mode) {
      case 'home': paintHome(ctx, s, now); break
      case 'fx': paintFx(ctx, s, now); break
      case 'env': paintEnv(ctx, s); break
      case 'edit': paintEdit(ctx, s); break
      case 'seq': paintSeq(ctx, s); break
      default: paintCells(ctx, s, pagesFor(s)[s.page].params, CENTER.y + 2, CENTER.h - 2)
    }
  }

  paintBottomBar(ctx, bottomText(s))

  const popup = s.popup && s.popup.until > Date.now() ? s.popup : null
  if (popup?.kind === 'presets') paintPresetList(ctx, s)
  else if (popup?.kind === 'algorithm') paintAlgorithmPopup(ctx, s.patch.algorithm)
  else if (popup?.kind === 'text') paintTextPopup(ctx, popup.lines ?? [])
}

function bottomText(s: FM1State): string {
  if (s.confirmReset) return 'K4 Yes  ·  K1 No'
  if (s.paramText && s.paramText.until > Date.now()) return s.paramText.text
  if (s.mode === 'fx') {
    const first = pagesFor(s)[0].params[0]
    if (first) return `${first.label}: ${fmtParam(first, s)}`
  }
  return modeLabel(s)
}

// ── Piezas comunes ──────────────────────────────────────────────────────

function paintBackground(ctx: Ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, LCD)
  g.addColorStop(0, '#e6e8ea')
  g.addColorStop(1, '#d3d6d9')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, LCD, LCD)
}

function paintTopBar(ctx: Ctx, title: string, battery = 0.8) {
  text(ctx, title, 10, 22, { size: 19, weight: 500, align: 'left' })
  ctx.strokeStyle = INK
  ctx.lineWidth = 2
  ctx.strokeRect(198, 13, 30, 18)
  ctx.fillStyle = INK
  ctx.fillRect(228, 18, 3, 8)
  ctx.fillRect(202, 17, 22 * battery, 10)
}

function paintBottomBar(ctx: Ctx, label: string) {
  box(ctx, 16, 198, 208, 30, 5, '#eef0f1', '#8b8f94')
  text(ctx, fit(ctx, label, 196, 17), 120, 214, { size: 17, weight: 500 })
}

interface TextOpts { size: number; weight?: number; align?: CanvasTextAlign; color?: string }
function text(ctx: Ctx, t: string, x: number, y: number, o: TextOpts) {
  ctx.font = `${o.weight ?? 500} ${o.size}px ${FONT}`
  ctx.fillStyle = o.color ?? INK
  ctx.textAlign = o.align ?? 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(t, x, y)
}

/** Recorta el texto con "…" si no cabe. */
function fit(ctx: Ctx, t: string, maxW: number, size: number, weight = 500) {
  ctx.font = `${weight} ${size}px ${FONT}`
  if (ctx.measureText(t).width <= maxW) return t
  let s = t
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxW) s = s.slice(0, -1)
  return `${s}…`
}

function box(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke = EDGE) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.5
  ctx.stroke()
}

/** Cuadrícula 2×2 con las cuatro perillas de la página. */
function paintCells(ctx: Ctx, s: FM1State, params: (ParamDef | null)[], y0: number, h: number) {
  const gap = 6
  const cw = (CENTER.w - gap) / 2
  const ch = (h - gap) / 2
  const active = s.paramText && s.paramText.until > Date.now() ? s.paramText.knob : -1
  params.forEach((p, i) => {
    const x = CENTER.x + (i % 2) * (cw + gap)
    const y = y0 + Math.floor(i / 2) * (ch + gap)
    if (!p) {
      box(ctx, x, y, cw, ch, 4, '#d9dcdf', '#b3b7bb')
      text(ctx, `K${i + 1}  —`, x + cw / 2, y + ch / 2, { size: 13, color: '#9a9ea3' })
      return
    }
    box(ctx, x, y, cw, ch, 4, i === active ? BOX_ON : BOX)
    text(ctx, fit(ctx, p.short ?? p.label, cw - 10, 13), x + cw / 2, y + 13, { size: 13, color: '#33363a' })
    text(ctx, fit(ctx, fmtParam(p, s), cw - 10, 21, 700), x + cw / 2, y + ch / 2 + 3, { size: 21, weight: 700 })
    if (!p.action && p.max - p.min > 1) {
      const t = (p.get(s) - p.min) / (p.max - p.min)
      ctx.fillStyle = '#8d9196'
      ctx.fillRect(x + 8, y + ch - 9, cw - 16, 3)
      ctx.fillStyle = INK
      ctx.fillRect(x + 8, y + ch - 9, (cw - 16) * t, 3)
    }
    text(ctx, `K${i + 1}`, x + 6, y + 9, { size: 9, align: 'left', color: '#6a6e73' })
  })
}

// ── Modos ───────────────────────────────────────────────────────────────

/** Home: osciloscopio, línea amarilla sobre gris (manual pág. 8). */
function paintHome(ctx: Ctx, s: FM1State, now: number) {
  const { x, y, w, h } = CENTER
  ctx.save()
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, 5)
  ctx.fillStyle = '#5c6065'
  ctx.fill()
  ctx.clip()
  ctx.strokeStyle = 'rgba(255,255,255,0.08)'
  ctx.lineWidth = 1
  for (let gx = x + w / 8; gx < x + w; gx += w / 8) line(ctx, gx, y, gx, y + h)
  for (let gy = y + h / 6; gy < y + h; gy += h / 6) line(ctx, x, gy, x + w, gy)

  const mid = y + h / 2
  ctx.strokeStyle = '#ffd60a'
  ctx.lineWidth = 2
  ctx.shadowColor = 'rgba(255, 214, 10, 0.6)'
  ctx.shadowBlur = 4

  // con el audio encendido, la onda real (disparada en el cruce por cero)
  const real = readScope()
  if (real) {
    let start = 1
    while (start < real.length / 2 && !(real[start - 1] < 0 && real[start] >= 0)) start++
    if (start >= real.length / 2) start = 0
    const span = 640
    ctx.beginPath()
    for (let px = 0; px <= w; px++) {
      const v = real[start + Math.floor((px / w) * span)] ?? 0
      const py = mid - Math.max(-1, Math.min(1, v * 1.6)) * (h / 2 - 6)
      px === 0 ? ctx.moveTo(x + px, py) : ctx.lineTo(x + px, py)
    }
    ctx.stroke()
    ctx.restore()
    return
  }

  // sin audio todavía: una simulación a partir de las notas que suenan
  const notes = [...new Set(s.sounding)]
  const amp = (h / 2 - 8) * (0.35 + 0.65 * s.master)
  const index = s.patch.ops[1].level / 30
  const ratio = Math.max(0.5, s.patch.ops[1].coarse || 0.5)
  const window = notes.length ? 3 / freq(Math.min(...notes)) : 0.01
  const drift = now * 0.00004

  ctx.beginPath()
  for (let px = 0; px <= w; px += 1) {
    const t = (px / w) * window + drift
    let v = 0
    for (const n of notes) {
      const ph = 2 * Math.PI * freq(n) * t
      v += Math.sin(ph + index * Math.sin(ph * ratio))
    }
    if (notes.length) v /= Math.sqrt(notes.length) * 1.4
    const py = mid - v * amp
    px === 0 ? ctx.moveTo(x + px, py) : ctx.lineTo(x + px, py)
  }
  ctx.stroke()
  ctx.restore()
}

const freq = (n: number) => 440 * Math.pow(2, (n - 69) / 12)
const line = (ctx: Ctx, x1: number, y1: number, x2: number, y2: number) => {
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
}

/** FX: cuadrícula 3×2 en el orden de la cadena. Caja brillante = ON. */
function paintFx(ctx: Ctx, s: FM1State, now: number) {
  const cols = [[16, 62], [88, 66], [164, 66]]
  const rows = [[52, 46], [116, 52]]
  s.patch.fx.order.forEach((id, i) => {
    const [x, w] = cols[i % 3]
    const [y, h] = rows[Math.floor(i / 3)]
    const on = s.patch.fx.units[id].on
    box(ctx, x, y, w, h, 4, on ? BOX_ON : '#d5d8db', on ? EDGE : '#a3a7ab')
    const name = id === 'distortion' ? ['Distort', 'ion'] : [FX_NAMES[id]]
    name.forEach((t, li) =>
      text(ctx, t, x + w / 2, y + h / 2 + (li - (name.length - 1) / 2) * 17, { size: 17, color: on ? INK : '#8a8e93' }))
    text(ctx, `${i + 1}`, x + 6, y + 8, { size: 9, align: 'left', color: on ? '#3c3f43' : '#a3a7ab' })
  })
  // punto rojo: parpadea al seleccionar, fijo cuando está "agarrado" con SEL
  const blinkOn = s.fxGrabbed || Math.floor(now / 400) % 2 === 0
  if (blinkOn) {
    const [x, w] = cols[s.fxSelected % 3]
    const [y, h] = rows[Math.floor(s.fxSelected / 3)]
    ctx.fillStyle = RED
    ctx.beginPath()
    ctx.arc(x + w / 2, y + h + 7, s.fxGrabbed ? 4.5 : 3.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

/** ENV: cuatro cajas con barras de bloques 0–8. */
function paintEnv(ctx: Ctx, s: FM1State) {
  const names = ['Attack', 'Decay', 'Sustain', 'Release']
  const vals = [s.patch.env.a, s.patch.env.d, s.patch.env.s, s.patch.env.r]
  const active = s.paramText && s.paramText.until > Date.now() ? s.paramText.knob : -1
  const gap = 5
  const w = (CENTER.w - gap * 3) / 4
  vals.forEach((v, i) => {
    const x = CENTER.x + i * (w + gap)
    const y = CENTER.y + 2
    const h = CENTER.h - 2
    box(ctx, x, y, w, h, 4, i === active ? BOX_ON : BOX)
    text(ctx, fit(ctx, names[i], w - 4, 12), x + w / 2, y + 12, { size: 12, color: '#33363a' })
    const bh = 9
    for (let b = 0; b < 8; b++) {
      const by = y + h - 26 - b * (bh + 3)
      ctx.fillStyle = b < v ? INK : 'rgba(0,0,0,0.12)'
      ctx.fillRect(x + 9, by, w - 18, bh)
    }
    text(ctx, `${v}`, x + w / 2, y + h - 11, { size: 15, weight: 700 })
  })
}

/** EDIT: cabecera con la sección (OP1…OP6, Pitch EG, Globe) + perillas. */
function paintEdit(ctx: Ctx, s: FM1State) {
  const page = pagesFor(s)[s.page]
  const who = typeof s.section === 'number' ? `OP${s.section + 1}` : s.section === 'pit' ? 'PITCH' : 'GLOBE'
  box(ctx, CENTER.x, CENTER.y + 1, CENTER.w, 20, 4, '#2b2d30', '#2b2d30')
  text(ctx, who, CENTER.x + 8, CENTER.y + 11, { size: 13, weight: 700, align: 'left', color: '#fff' })
  text(ctx, page.title, CENTER.x + CENTER.w - 8, CENTER.y + 11, { size: 13, align: 'right', color: '#d6d8da' })
  paintCells(ctx, s, page.params, CENTER.y + 26, CENTER.h - 26)
}

/** SEQ: los 16 pasos arriba y las perillas abajo. */
function paintSeq(ctx: Ctx, s: FM1State) {
  const pat = s.seq.patterns[s.seq.pattern]
  const gap = 2
  const w = (CENTER.w - gap * 15) / 16
  for (let i = 0; i < 16; i++) {
    const x = CENTER.x + i * (w + gap)
    const y = CENTER.y + 2
    const current = (s.seq.playing || s.seq.recording) && s.seq.step === i
    const fill = current ? RED : pat[i].length ? INK : '#d5d8db'
    box(ctx, x, y, w, 16, 2, fill, current ? RED : '#8b8f94')
    if (s.seq.recording && s.seq.recPos === i) {
      ctx.strokeStyle = RED
      ctx.lineWidth = 2
      ctx.strokeRect(x - 1, y - 1, w + 2, 18)
    }
  }
  paintCells(ctx, s, pagesFor(s)[s.page].params, CENTER.y + 24, CENTER.h - 24)
}

function paintConfirmReset(ctx: Ctx) {
  box(ctx, CENTER.x, CENTER.y + 2, CENTER.w, CENTER.h - 2, 5, BOX)
  text(ctx, 'Reset all 128', 120, 86, { size: 18, weight: 700 })
  text(ctx, 'patches?', 120, 108, { size: 18, weight: 700 })
  text(ctx, 'KNOB4: Yes', 120, 140, { size: 15 })
  text(ctx, 'KNOB1: Cancel', 120, 160, { size: 15 })
}

// ── Popups (≈1 s) ───────────────────────────────────────────────────────

function popupFrame(ctx: Ctx) {
  ctx.fillStyle = 'rgba(40, 42, 46, 0.25)'
  ctx.fillRect(0, 40, LCD, 154)
  box(ctx, 14, 46, 212, 144, 6, '#f4f5f6', '#3c3f43')
}

function paintPresetList(ctx: Ctx, s: FM1State) {
  popupFrame(ctx)
  const rowH = 26
  for (let r = -2; r <= 2; r++) {
    const idx = (((s.presetIndex + r) % 128) + 128) % 128
    const y = 118 + r * rowH
    if (r === 0) box(ctx, 20, y - rowH / 2 + 1, 200, rowH - 2, 4, '#2b2d30', '#2b2d30')
    const color = r === 0 ? '#fff' : Math.abs(r) === 1 ? '#3c3f43' : '#8a8e93'
    text(ctx, String(idx + 1).padStart(3, '0'), 28, y, { size: 16, weight: 700, align: 'left', color })
    text(ctx, s.bank[idx].name, 66, y, { size: 16, align: 'left', color })
  }
}

function paintAlgorithmPopup(ctx: Ctx, alg: number) {
  popupFrame(ctx)
  text(ctx, `Algorithm ${String(alg + 1).padStart(2, '0')}`, 120, 60, { size: 14, weight: 700 })
  drawAlgorithm(ctx, alg, 22, 72, 196, 112)
}

/** Diagrama: portadoras abajo (oscuras), moduladores arriba, lazo de feedback. */
export function drawAlgorithm(ctx: Ctx, alg: number, x: number, y: number, w: number, h: number) {
  const a = ALGORITHMS[alg]
  const L = layoutAlgorithm(a)
  const bw = 28
  const bh = 20
  const cs = Math.min(38, (w - bw - 14) / Math.max(1, L.cols - 1))
  const rs = Math.min(30, (h - bh - 14) / Math.max(1, L.rows - 1))
  const x0 = x + w / 2 - ((L.cols - 1) * cs) / 2
  const yBottom = y + h - 14 - bh / 2
  const P = (op: number) => ({ px: x0 + L.pos[op].col * cs, py: yBottom - L.pos[op].row * rs })

  ctx.strokeStyle = INK
  ctx.lineWidth = 1.5
  for (const [f, t] of a.mods) {
    const A = P(f)
    const B = P(t)
    line(ctx, A.px, A.py + bh / 2, B.px, B.py - bh / 2)
  }
  // bus de salida de las portadoras
  const cx = a.carriers.map((c) => P(c).px)
  const busY = yBottom + bh / 2 + 7
  cx.forEach((px) => line(ctx, px, yBottom + bh / 2, px, busY))
  line(ctx, Math.min(...cx), busY, Math.max(...cx), busY)

  // feedback
  const [fbOp, fbFrom] = a.fb
  const T = P(fbOp)
  const F = P(fbFrom)
  const side = Math.max(T.px, F.px) + bw / 2 + 5
  const topY = T.py - bh / 2 - 5
  ctx.beginPath()
  ctx.moveTo(F.px + bw / 2, F.py)
  ctx.lineTo(side, F.py)
  ctx.lineTo(side, topY)
  ctx.lineTo(T.px, topY)
  ctx.lineTo(T.px, T.py - bh / 2)
  ctx.stroke()

  for (let op = 1; op <= 6; op++) {
    const { px, py } = P(op)
    const carrier = a.carriers.includes(op)
    box(ctx, px - bw / 2, py - bh / 2, bw, bh, 3, carrier ? '#2b2d30' : '#c4c7cb', INK)
    text(ctx, `${op}`, px, py + 0.5, { size: 12, weight: 700, color: carrier ? '#fff' : INK })
  }
}

function paintTextPopup(ctx: Ctx, lines: string[]) {
  popupFrame(ctx)
  if (lines.length >= 2) {
    text(ctx, lines[0], 120, 92, { size: 18, weight: 500 })
    text(ctx, lines[1], 120, 136, { size: lines[1].length > 6 ? 26 : 44, weight: 700 })
  } else {
    text(ctx, fit(ctx, lines[0] ?? '', 196, 20, 700), 120, 118, { size: 20, weight: 700 })
  }
}
