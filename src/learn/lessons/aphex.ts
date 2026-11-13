// «Nieve tibia»: pieza original con la técnica de Aphex Twin en sus discos
// ambient (piano FM triste, arpegio lento que se repite, melodía suelta
// encima). No copia ninguna canción: progresión y melodía son nuestras.
//
// Todo cae en teclas blancas y dentro de las letras A–Ñ del teclado de la
// compu: el arpegio en la octava 0 y la melodía en la +1.

import type { FM1State } from '../../fm1/store'
import { evenDemo, keyFor, singles, type DemoEvent, type Lesson } from '../lesson'

// Re menor · Fa · Do · La menor sobre Mi — 4 notas cada uno = los 16 pasos del SEQ
const DM = [62, 69, 74, 77]
const F = [65, 69, 72, 77]
const C = [60, 67, 72, 76]
const AM_E = [64, 69, 72, 76]
export const ARP = [...DM, ...F, ...C, ...AM_E]

// melodía (una octava arriba): dos vueltas del arpegio, una nota cada dos pasos
const MEL_1 = [81, 77, 76, 72, 74, 76, 72]
const MEL_2 = [74, 77, 81, 79, 76, 79, 76]
export const MELODY = [...MEL_1, ...MEL_2]

const STEP_MS = 333 // corcheas a 90 BPM

/** Cada vuelta: 2 notas por acorde, la última larga. */
const melodyDemo = (start: number): DemoEvent[] => {
  const out: DemoEvent[] = []
  ;[MEL_1, MEL_2].forEach((phrase, loop) => {
    const at = [0, 2, 4, 6, 8, 10, 12]
    phrase.forEach((note, i) => {
      const long = i === phrase.length - 1
      out.push({ t: start + (loop * 16 + at[i]) * STEP_MS, note, d: (long ? 4 : 2) * STEP_MS * 0.95 })
    })
  })
  return out
}

const arpDemo = (loops: number): DemoEvent[] =>
  Array.from({ length: loops }, (_, l) => evenDemo(singles(ARP), STEP_MS, 0.85).map((e) => ({ ...e, t: e.t + l * 16 * STEP_MS }))).flat()

const FULL_DEMO = [...arpDemo(3), ...melodyDemo(16 * STEP_MS)]

const twice = (notes: number[]) => singles([...notes, ...notes])

const pattern = (s: FM1State) => s.seq.patterns[s.seq.pattern]
const recorded = (s: FM1State) => ARP.every((n, i) => pattern(s)[i].includes(n))

export const APHEX: Lesson = {
  id: 'nieve-tibia',
  title: 'Warm Snow',
  subtitle: 'Aphex Twin style · FM piano, slow arpeggio and melody',
  steps: [
    {
      title: 'In the style of Aphex Twin',
      body: '“Warm Snow” is an original piece using his techniques: a sad FM piano, a slow arpeggio that loops on its own and a loose melody on top. Listen first.',
      demo: FULL_DEMO,
    },
    {
      title: 'The sound',
      body: 'His ambient records lean on FM electric pianos, like the DX7’s. The FM-1 has one: E.PIANO 1, preset 005.',
      task: 'Turn PRESETS to 005 E.PIANO 1',
      target: 'presets',
      check: (s) => s.presetIndex === 4,
    },
    {
      title: 'Let it breathe',
      body: 'With a long Release, each note fades slowly instead of stopping short. That’s half the melancholy.',
      task: 'Open ENV and raise Release (KNOB4) to 5 or more',
      target: (s) => (s.mode !== 'env' ? 'env' : 'knob4'),
      check: (s, a) => s.mode === 'env' && s.patch.env.r >= Math.min(8, Math.max(5, a.patch.env.r + 1)),
    },
    {
      title: 'Lots of space',
      body: 'Reverb puts the piano in a big, empty room. Turn up the Mix so it sounds far away.',
      task: 'In FX, pick Reverb with SELECT and raise Mix (KNOB3) to 60%',
      target: (s) => {
        if (s.mode !== 'fx') return 'fx'
        if (s.patch.fx.order[s.fxSelected] !== 'reverb') return 'select'
        if (!s.patch.fx.units.reverb.on) return 'knob4'
        return 'knob3'
      },
      check: (s) => s.patch.fx.units.reverb.on && s.patch.fx.units.reverb.p[1] >= 60,
    },
    {
      title: 'Left hand: D minor',
      body: 'The arpeggio is 4 chords of 4 notes, low to high. The first is D, A, D, F. Play it twice.',
      task: 'Play the blue keys',
      follow: twice(DM),
      demo: evenDemo(twice(DM), 420),
    },
    {
      title: 'F major',
      body: 'The second chord: F, A, C, F. Notice the second and last notes stay put.',
      task: 'Play the blue keys',
      follow: twice(F),
      demo: evenDemo(twice(F), 420),
    },
    {
      title: 'C and A minor',
      body: 'The last two: C, G, C, E and then E, A, C, E. That last one leads back to D minor.',
      task: 'Play the blue keys',
      follow: singles([...C, ...AM_E]),
      demo: evenDemo(singles([...C, ...AM_E]), 420),
    },
    {
      title: 'All 16 together',
      body: 'Now the whole arpeggio, without stopping. Speed doesn’t matter: the SEQ will play it for you.',
      task: 'Play the 16 notes',
      follow: singles(ARP),
      demo: evenDemo(singles(ARP), STEP_MS),
    },
    {
      title: 'Slower',
      body: 'In SEQ, Rate sets how often it steps and Tempo how fast everything goes. For this style: eighth notes and a low tempo.',
      task: 'Open SEQ: Rate to 1/8 (KNOB3) and Tempo to 100 or less (KNOB4)',
      target: (s) => {
        if (s.arp.on) return 'arp'
        if (!s.seq.on || s.mode !== 'seq') return 'seq'
        if (s.page !== 0) return 'select'
        if (s.seq.rate !== 1) return 'knob3'
        return 'knob4'
      },
      check: (s) => s.seq.on && s.seq.rate === 1 && s.tempo <= 100,
    },
    {
      title: 'Record it',
      body: 'With REC on, each note fills the next step. Release each key before the next one, or they merge into a chord. If you slip, keep going: after step 16 it starts over.',
      task: 'Press REC and play the 16 notes',
      target: (s) => {
        if (!s.seq.on) return 'seq'
        if (!s.seq.recording) return recorded(s) ? null : 'rec'
        return keyFor(s, ARP[s.seq.recPos])
      },
      check: (s) => s.seq.on && recorded(s),
    },
    {
      title: 'Let it loop',
      body: 'Press REC again to stop recording. The arpeggio keeps looping; the white keys show the current step.',
      task: 'Press REC',
      target: (s) => (s.seq.recording ? 'rec' : s.seq.on && !s.seq.playing ? 'play' : 'rec'),
      check: (s) => s.seq.on && s.seq.playing && !s.seq.recording,
    },
    {
      title: 'One octave up',
      body: 'The melody sits higher. Go up an octave: what you recorded in the SEQ doesn’t change.',
      task: 'Set the octave to +1',
      target: (s) => (s.octave < 1 ? 'octUp' : 'octDown'),
      check: (s) => s.octave === 1,
    },
    {
      title: 'The melody',
      body: 'Play the melody over the arpeggio, no rush. It doesn’t have to be exact: in these pieces everything floats a little loose.',
      task: 'Play the blue keys',
      follow: singles(MELODY),
      demo: melodyDemo(0),
    },
    {
      title: 'You played “Warm Snow”!',
      body: 'Try turning PRESETS while the arpeggio plays: the pattern keeps going and the color changes. If you like your sound, hold SAVE to keep it.',
    },
  ],
}
