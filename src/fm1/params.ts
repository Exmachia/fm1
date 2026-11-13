// Qué hace cada perilla (KNOB1–4) en cada modo y página, según el manual.

import type { FM1State } from './store'
import {
  CURVES, FILTER_TYPES, FX_NAMES, LFO_WAVES, REVERB_TYPES, breakPointName, clonePatch, cutoffHz,
  type FxId, type Patch,
} from './patch'

export interface ParamDef {
  /** Nombre completo (barra inferior). */
  label: string
  /** Nombre corto para la celda de la pantalla. */
  short?: string
  min: number
  max: number
  step?: number
  get: (s: FM1State) => number
  set: (s: FM1State, v: number) => Partial<FM1State>
  fmt?: (v: number) => string
  /** Perillas que disparan una acción en vez de cambiar un valor. */
  action?: (s: FM1State, dir: number) => Partial<FM1State> | null
}

export interface Page { title: string; params: (ParamDef | null)[] }

export const ARP_MODES = ['Up', 'Down', 'Inclusive', 'Exclusive', 'Order', 'Repeat', 'Random']
export const RATES = ['1/4', '1/8', '1/8T', '1/16', '1/16T', '1/32']
export const RATE_BEATS = [1, 1 / 2, 1 / 3, 1 / 4, 1 / 6, 1 / 8]

const onOff = (v: number) => (v ? 'On' : 'Off')
const pct = (v: number) => `${v}%`
const signed = (v: number) => (v > 0 ? `+${v}` : `${v}`)

/** Parámetro guardado en la voz actual. */
function pp(
  label: string, min: number, max: number,
  get: (p: Patch) => number, set: (p: Patch, v: number) => void,
  extra: Partial<ParamDef> = {},
): ParamDef {
  return {
    label, min, max,
    get: (s) => get(s.patch),
    set: (s, v) => {
      const patch = clonePatch(s.patch)
      set(patch, v)
      return { patch }
    },
    ...extra,
  }
}

// ── FX ──────────────────────────────────────────────────────────────────
function fxParams(id: FxId): (ParamDef | null)[] {
  const u = (p: Patch) => p.fx.units[id]
  const typed = id === 'filter' || id === 'reverb'
  const names: Record<FxId, string[]> = {
    filter: ['CutOff', 'Q'],
    reverb: ['Decay', 'Mix'],
    delay: ['Decay', 'Rate', 'Mix'],
    distortion: ['Gain', 'Tone', 'Level'],
    chorus: ['Freq', 'Depth', 'Mix'],
    phaser: ['Freq', 'Depth', 'Mix'],
  }
  const onParam = pp('Effect', 0, 1, (p) => +u(p).on, (p, v) => (u(p).on = !!v), { fmt: onOff })
  const values = names[id].map((name, i) => {
    if (id === 'filter' && i === 0) return pp(name, 0, 99, (p) => u(p).p[0], (p, v) => (u(p).p[0] = v), { fmt: (v) => `${cutoffHz(v)}Hz` })
    if (id === 'filter' && i === 1) return pp(name, 0, 100, (p) => u(p).p[1], (p, v) => (u(p).p[1] = v))
    const step = id === 'reverb' ? 10 : 1
    return pp(name, 0, 100, (p) => u(p).p[i], (p, v) => (u(p).p[i] = v), { fmt: pct, step })
  })
  if (typed) {
    const types = id === 'filter' ? FILTER_TYPES : REVERB_TYPES
    const type = pp('Type', 0, types.length - 1, (p) => u(p).type, (p, v) => (u(p).type = v), { fmt: (v) => types[v] })
    return [type, ...values, onParam]
  }
  return [...values, onParam]
}

// ── EDIT ────────────────────────────────────────────────────────────────
function opPages(i: number): Page[] {
  const o = (p: Patch) => p.ops[i]
  const four = (label: string, key: 'rates' | 'levels') =>
    [0, 1, 2, 3].map((k) => pp(`${label} ${k + 1}`, 0, 99, (p) => o(p)[key][k], (p, v) => (o(p)[key][k] = v)))
  return [
    { title: 'Envelope', params: four('Rate', 'rates') },
    { title: 'Envelope', params: four('Level', 'levels') },
    {
      title: 'Tuning',
      params: [
        pp('Detune', 0, 14, (p) => o(p).detune, (p, v) => (o(p).detune = v), { fmt: (v) => signed(v - 7) }),
        pp('FreqCoarse', 0, 31, (p) => o(p).coarse, (p, v) => (o(p).coarse = v), { short: 'Coarse' }),
        pp('FreqFine', 0, 99, (p) => o(p).fine, (p, v) => (o(p).fine = v), { short: 'Fine' }),
        pp('OscMode', 0, 1, (p) => +o(p).fixed, (p, v) => (o(p).fixed = !!v), { fmt: (v) => (v ? 'Fixed' : 'Ratio') }),
      ],
    },
    {
      title: 'Sens & Level',
      params: [
        pp('A ModSens', 0, 3, (p) => o(p).ams, (p, v) => (o(p).ams = v), { short: 'ModSens' }),
        pp('KeyVelocity', 0, 7, (p) => o(p).velSens, (p, v) => (o(p).velSens = v), { short: 'KeyVel' }),
        pp('Out Level', 0, 99, (p) => o(p).level, (p, v) => (o(p).level = v)),
        null,
      ],
    },
    {
      title: 'Scaling',
      params: [
        pp('L Depth', 0, 99, (p) => o(p).lDepth, (p, v) => (o(p).lDepth = v)),
        pp('R Depth', 0, 99, (p) => o(p).rDepth, (p, v) => (o(p).rDepth = v)),
        pp('BreakPoint', 0, 99, (p) => o(p).bp, (p, v) => (o(p).bp = v), { fmt: breakPointName, short: 'BrkPoint' }),
        null,
      ],
    },
    {
      title: 'Scaling',
      params: [
        pp('L Curve', 0, 3, (p) => o(p).lCurve, (p, v) => (o(p).lCurve = v), { fmt: (v) => CURVES[v] }),
        pp('R Curve', 0, 3, (p) => o(p).rCurve, (p, v) => (o(p).rCurve = v), { fmt: (v) => CURVES[v] }),
        pp('RateScale', 0, 7, (p) => o(p).rateScale, (p, v) => (o(p).rateScale = v)),
        null,
      ],
    },
  ]
}

const pitchPages = (): Page[] => {
  const four = (label: string, key: 'rates' | 'levels') =>
    [0, 1, 2, 3].map((k) => pp(`${label} ${k + 1}`, 0, 99, (p) => p.pitchEnv[key][k], (p, v) => (p.pitchEnv[key][k] = v)))
  return [
    { title: 'Pitch EG', params: four('Rate', 'rates') },
    { title: 'Pitch EG', params: four('Level', 'levels') },
  ]
}

const globePatchPages = (): Page[] => [
  {
    title: 'Globe',
    params: [
      pp('Algorithm', 0, 31, (p) => p.algorithm, (p, v) => (p.algorithm = v), { fmt: (v) => `${v + 1}` }),
      pp('Feedback', 0, 7, (p) => p.feedback, (p, v) => (p.feedback = v)),
      pp('Osc Sync', 0, 1, (p) => +p.oscSync, (p, v) => (p.oscSync = !!v), { fmt: onOff }),
      pp('Transpose', 0, 48, (p) => p.transpose, (p, v) => (p.transpose = v)),
    ],
  },
]

// ── Parámetros que no viven en la voz ──────────────────────────────────
function sp<K extends keyof FM1State>(
  label: string, min: number, max: number, key: K, sub: string, extra: Partial<ParamDef> = {},
): ParamDef {
  return {
    label, min, max,
    get: (s) => (s[key] as Record<string, number>)[sub],
    set: (s, v) => ({ [key]: { ...(s[key] as object), [sub]: v } }) as Partial<FM1State>,
    ...extra,
  }
}

const tempo: ParamDef = {
  label: 'Tempo', min: 30, max: 300, get: (s) => s.tempo, set: (_, v) => ({ tempo: v }), fmt: (v) => `${v}BPM`,
}

// ── Páginas por modo ───────────────────────────────────────────────────
export function pagesFor(s: FM1State): Page[] {
  switch (s.mode) {
    case 'fx': {
      const id = s.patch.fx.order[s.fxSelected]
      return [{ title: FX_NAMES[id], params: fxParams(id) }]
    }
    case 'env':
      return [{
        title: 'Envelope',
        params: (['a', 'd', 's', 'r'] as const).map((k, i) =>
          pp(['Attack', 'Decay', 'Sustain', 'Release'][i], 0, 8, (p) => p.env[k], (p, v) => (p.env[k] = v))),
      }]
    case 'lfo':
      return [
        {
          title: 'LFO',
          params: [
            pp('Wave', 0, 5, (p) => p.lfo.wave, (p, v) => (p.lfo.wave = v), { fmt: (v) => LFO_WAVES[v] }),
            pp('Speed', 0, 99, (p) => p.lfo.speed, (p, v) => (p.lfo.speed = v)),
            pp('PMD', 0, 99, (p) => p.lfo.pmd, (p, v) => (p.lfo.pmd = v)),
            pp('AMD', 0, 99, (p) => p.lfo.amd, (p, v) => (p.lfo.amd = v)),
          ],
        },
        {
          title: 'LFO',
          params: [
            pp('Delay', 0, 99, (p) => p.lfo.delay, (p, v) => (p.lfo.delay = v)),
            pp('Pitch Sens', 0, 7, (p) => p.lfo.pitchSens, (p, v) => (p.lfo.pitchSens = v)),
            pp('Lfo Sync', 0, 1, (p) => p.lfo.sync, (p, v) => (p.lfo.sync = v)),
            pp('Osc Sync', 0, 1, (p) => +p.oscSync, (p, v) => (p.oscSync = !!v)),
          ],
        },
      ]
    case 'edit':
      if (s.section === 'pit') return pitchPages()
      if (s.section === 'glo') return globePatchPages()
      return opPages(s.section)
    case 'glo':
      return [
        {
          title: 'Globe',
          params: [
            sp('Note Channel', 1, 16, 'global', 'noteCh', { short: 'Note Ch' }),
            sp('Effect Channel', 1, 16, 'global', 'fxCh', { short: 'Effect Ch' }),
            sp('Pitch Bend Up', 1, 24, 'global', 'pbUp', { short: 'Bend Up' }),
            sp('Pitch Bend Down', 1, 24, 'global', 'pbDown', { short: 'Bend Down' }),
          ],
        },
        {
          title: 'Globe',
          params: [
            {
              label: 'Reset Patches', short: 'Reset', min: 0, max: 0, get: () => 0, set: () => ({}),
              fmt: () => 'Turn >', action: (_, dir) => (dir > 0 ? { confirmReset: true } : null),
            },
            {
              label: 'Globe Save', short: 'Save', min: 0, max: 0, get: () => 0, set: () => ({}),
              fmt: () => 'Turn >', action: () => ({ saveGlobalRequested: true }),
            },
            null,
            null,
          ],
        },
      ]
    case 'arp':
      return [
        {
          title: 'Arpeggio',
          params: [
            sp('Mode', 0, 6, 'arp', 'mode', { fmt: (v) => ARP_MODES[v] }),
            sp('Octave', 1, 4, 'arp', 'octave'),
            sp('Rate', 0, 5, 'arp', 'rate', { fmt: (v) => RATES[v] }),
            tempo,
          ],
        },
        {
          title: 'Arpeggio',
          params: [
            sp('Gate', 20, 100, 'arp', 'gate', { fmt: pct, step: 5 }),
            sp('Swing', 50, 75, 'arp', 'swing', { fmt: pct }),
            sp('Latch', 0, 1, 'arp', 'latch', { fmt: onOff }),
            null,
          ],
        },
      ]
    case 'seq':
      return [
        {
          title: 'Sequencer',
          params: [
            sp('Pattern', 0, 15, 'seq', 'pattern', { fmt: (v) => `${v + 1}` }),
            {
              label: 'Clear', min: 0, max: 0, get: () => 0, set: () => ({}), fmt: () => 'Turn >',
              action: (st) => {
                const patterns = st.seq.patterns.map((p, i) => (i === st.seq.pattern ? emptyPattern() : p))
                return { seq: { ...st.seq, patterns, recPos: 0 }, popupText: ['Pattern', 'Cleared'] }
              },
            },
            sp('Rate', 0, 5, 'seq', 'rate', { fmt: (v) => RATES[v] }),
            tempo,
          ],
        },
        {
          title: 'Sequencer',
          params: [
            sp('Gate', 20, 100, 'seq', 'gate', { fmt: pct, step: 5 }),
            sp('Swing', 50, 75, 'seq', 'swing', { fmt: pct }),
            null,
            null,
          ],
        },
      ]
    default:
      return [{ title: 'Home', params: [null, null, null, null] }]
  }
}

export const emptyPattern = (): number[][] => Array.from({ length: 16 }, () => [])

/** Texto de la barra inferior cuando no se está moviendo nada: "1/2 LFO". */
export function modeLabel(s: FM1State): string {
  const pages = pagesFor(s)
  let name = pages[s.page]?.title ?? 'Home'
  if (s.mode === 'edit' && typeof s.section === 'number') name = `OP${s.section + 1} ${name}`
  return pages.length > 1 ? `${s.page + 1}/${pages.length} ${name}` : name
}

export const fmtParam = (p: ParamDef, s: FM1State) => (p.fmt ? p.fmt(p.get(s)) : `${p.get(s)}`)
