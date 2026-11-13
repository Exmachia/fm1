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
  title: 'Nieve tibia',
  subtitle: 'Al estilo Aphex Twin · piano FM, arpegio lento y melodía',
  steps: [
    {
      title: 'Al estilo Aphex Twin',
      body: '«Nieve tibia» es una pieza original con su técnica: un piano FM triste, un arpegio lento que se repite solo y una melodía suelta encima. Escúchala primero.',
      demo: FULL_DEMO,
    },
    {
      title: 'El sonido',
      body: 'En sus discos ambient usaba mucho pianos eléctricos FM, como los del DX7. El FM-1 trae uno: E.PIANO 1, el preset 005.',
      task: 'Gira PRESETS hasta 005 E.PIANO 1',
      target: 'presets',
      check: (s) => s.presetIndex === 4,
    },
    {
      title: 'Que respire',
      body: 'Con un Release largo, cada nota se apaga despacio en lugar de cortarse. Es la mitad de la melancolía.',
      task: 'Entra a ENV y sube Release (KNOB4) a 5 o más',
      target: (s) => (s.mode !== 'env' ? 'env' : 'knob4'),
      check: (s, a) => s.mode === 'env' && s.patch.env.r >= Math.min(8, Math.max(5, a.patch.env.r + 1)),
    },
    {
      title: 'Mucho espacio',
      body: 'La reverb hace que el piano suene en un cuarto grande y vacío. Súbele el Mix para que se oiga lejos.',
      task: 'En FX, elige Reverb con SELECT y sube Mix (KNOB3) a 60 %',
      target: (s) => {
        if (s.mode !== 'fx') return 'fx'
        if (s.patch.fx.order[s.fxSelected] !== 'reverb') return 'select'
        if (!s.patch.fx.units.reverb.on) return 'knob4'
        return 'knob3'
      },
      check: (s) => s.patch.fx.units.reverb.on && s.patch.fx.units.reverb.p[1] >= 60,
    },
    {
      title: 'Mano izquierda: Re menor',
      body: 'El arpegio son 4 acordes de 4 notas, de grave a agudo. El primero es Re, La, Re, Fa. Tócalo dos veces.',
      task: 'Toca las teclas azules',
      follow: twice(DM),
      demo: evenDemo(twice(DM), 420),
    },
    {
      title: 'Fa mayor',
      body: 'El segundo acorde: Fa, La, Do, Fa. Fíjate que la segunda y la última nota no se mueven.',
      task: 'Toca las teclas azules',
      follow: twice(F),
      demo: evenDemo(twice(F), 420),
    },
    {
      title: 'Do y La menor',
      body: 'Los dos últimos: Do, Sol, Do, Mi y luego Mi, La, Do, Mi. Ese último regresa solo al Re menor.',
      task: 'Toca las teclas azules',
      follow: singles([...C, ...AM_E]),
      demo: evenDemo(singles([...C, ...AM_E]), 420),
    },
    {
      title: 'Los 16 juntos',
      body: 'Ahora el arpegio entero, sin parar. No importa la velocidad: lo va a tocar el SEQ por ti.',
      task: 'Toca las 16 notas',
      follow: singles(ARP),
      demo: evenDemo(singles(ARP), STEP_MS),
    },
    {
      title: 'Más lento',
      body: 'En SEQ, Rate dice cada cuánto avanza un paso y Tempo qué tan rápido va todo. Para este estilo: corcheas y tempo bajo.',
      task: 'Entra a SEQ: Rate en 1/8 (KNOB3) y Tempo en 100 o menos (KNOB4)',
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
      title: 'Grábalo',
      body: 'Con REC, cada nota ocupa el siguiente paso. Suelta cada tecla antes de tocar la otra, o se juntan en un acorde. Si te equivocas, sigue: al llegar al 16 vuelve a empezar.',
      task: 'Presiona REC y toca las 16 notas',
      target: (s) => {
        if (!s.seq.on) return 'seq'
        if (!s.seq.recording) return recorded(s) ? null : 'rec'
        return keyFor(s, ARP[s.seq.recPos])
      },
      check: (s) => s.seq.on && recorded(s),
    },
    {
      title: 'Que se repita solo',
      body: 'Presiona REC otra vez para dejar de grabar. El arpegio sigue sonando en bucle; las teclas blancas muestran el paso.',
      task: 'Presiona REC',
      target: (s) => (s.seq.recording ? 'rec' : s.seq.on && !s.seq.playing ? 'play' : 'rec'),
      check: (s) => s.seq.on && s.seq.playing && !s.seq.recording,
    },
    {
      title: 'Una octava arriba',
      body: 'La melodía va más aguda. Sube una octava: lo que grabaste en el SEQ no cambia.',
      task: 'Deja la octava en +1',
      target: (s) => (s.octave < 1 ? 'octUp' : 'octDown'),
      check: (s) => s.octave === 1,
    },
    {
      title: 'La melodía',
      body: 'Toca la melodía encima del arpegio, sin prisa. No tiene que caer exacto: en estas piezas todo flota un poco suelto.',
      task: 'Toca las teclas azules',
      follow: singles(MELODY),
      demo: melodyDemo(0),
    },
    {
      title: '¡Tocaste «Nieve tibia»!',
      body: 'Prueba girar PRESETS mientras suena el arpegio: el patrón sigue y cambia el color. Si te gusta tu sonido, mantén SAVE para guardarlo.',
    },
  ],
}
