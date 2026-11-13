// Recorrido de bienvenida: una parte del FM-1 a la vez. Cada paso señala un
// control, dice qué hace en una frase y espera a que lo pruebes.

import type { FM1State } from '../fm1/store'
import type { Step } from './lesson'

export type { Step }

const filled = (s: FM1State) => s.seq.patterns[s.seq.pattern].filter((st) => st.length).length

export const INTRO: Step[] = [
  {
    title: 'Este es el FM-1',
    body: 'Un sintetizador FM de 6 operadores. Te enseño cada parte, una por una, y tú la pruebas.',
    target: null,
  },
  {
    title: 'Las teclas',
    body: 'Las 27 teclas tocan notas. También puedes usar las letras A S D F G H J K de tu teclado.',
    task: 'Toca una tecla',
    target: 'key-7',
    check: (s) => s.pressedKeys.size > 0,
  },
  {
    title: 'MASTER',
    body: 'Es el volumen general. Las perillas se giran arrastrando hacia arriba o abajo, o con la rueda del mouse.',
    task: 'Gira MASTER',
    target: 'master',
    check: (s, a) => s.master !== a.master,
  },
  {
    title: 'La pantalla',
    body: 'Arriba, el sonido actual. En medio, lo que estás editando. Abajo, el modo y la página, o el valor que mueves.',
    target: 'screen',
  },
  {
    title: 'PRESETS',
    body: 'Recorre los 128 sonidos guardados. Cada vez que lo giras cambia el sonido al instante.',
    task: 'Elige otro sonido y tócalo',
    target: (s) => (s.presetIndex === 0 ? 'presets' : 'key-7'),
    check: (s, a) => s.presetIndex !== a.presetIndex && s.pressedKeys.size > 0,
  },
  {
    title: 'OCT− y OCT+',
    body: 'Mueven todo el teclado una octava. Su LED parpadea lento en ±1, rápido en ±2 y se queda fijo en ±3.',
    task: 'Sube una octava',
    target: 'octUp',
    check: (s) => s.octave > 0,
  },
  {
    title: 'Regresa a 0',
    body: 'Presionar OCT− y OCT+ al mismo tiempo regresa la octava y el transpose a 0. Con el mouse, baja con OCT− hasta que se apague el LED.',
    task: 'Deja la octava en 0',
    target: 'octDown',
    check: (s) => s.octave === 0,
  },
  {
    title: '¿Qué es FM?',
    body: 'Cada operador es una onda: o suena (portadora) o deforma a otra (modulador). El ALGORITHM decide cómo se conectan los 6.',
    task: 'Gira ALGORITHM y mira el diagrama',
    target: 'algorithm',
    check: (s, a) => s.patch.algorithm !== a.patch.algorithm,
  },
  {
    title: 'Efectos',
    body: 'FX muestra la cadena de 6 efectos. La caja brillante está encendida; la apagada no suena.',
    task: 'Presiona FX',
    target: 'fx',
    check: (s) => s.mode === 'fx',
  },
  {
    title: 'Elige un efecto',
    body: 'SELECT mueve el punto rojo entre los efectos. Lo que esté marcado es lo que controlan KNOB1–4.',
    task: 'Gira SELECT',
    target: (s) => (s.mode === 'fx' ? 'select' : 'fx'),
    check: (s, a) => s.mode === 'fx' && s.fxSelected !== a.fxSelected,
  },
  {
    title: 'KNOB1 a KNOB4',
    body: 'Cambian de función según el modo. La barra de abajo te dice qué estás moviendo y su valor.',
    task: 'Gira KNOB2 y toca una tecla',
    target: (s) => (s.mode !== 'fx' ? 'fx' : s.paramText ? 'key-7' : 'knob2'),
    check: (s) => s.mode === 'fx' && !!s.paramText && s.pressedKeys.size > 0,
  },
  {
    title: 'ENV',
    body: 'La envolvente da forma a cada nota: Attack (cómo entra), Decay, Sustain y Release (cómo se va).',
    task: 'Entra a ENV y sube el Attack a 4 o más',
    target: (s) => (s.mode !== 'env' ? 'env' : 'knob1'),
    check: (s) => s.mode === 'env' && s.patch.env.a >= 4,
  },
  {
    title: 'LFO',
    body: 'Un LFO es una onda lenta que mueve el sonido. PMD hace vibrar la afinación; AMD, el volumen.',
    task: 'Entra a LFO y sube PMD (KNOB3)',
    target: (s) => (s.mode !== 'lfo' ? 'lfo' : 'knob3'),
    check: (s) => s.mode === 'lfo' && s.patch.lfo.pmd >= 10,
  },
  {
    title: 'EDIT',
    body: 'Aquí editas cada operador. En EDIT, las teclas negras con nombre (OP1–OP6, PIT, GLO) eligen qué editar.',
    task: 'Presiona EDIT y luego la tecla OP2',
    target: (s) => (s.mode !== 'edit' ? 'edit' : 'key-3'),
    check: (s) => s.mode === 'edit' && s.section === 1,
  },
  {
    title: 'Páginas',
    body: 'Casi todos los modos tienen varias páginas. SELECT las recorre; la barra de abajo dice en cuál estás.',
    task: 'Gira SELECT hasta la página 3',
    target: (s) => (s.mode !== 'edit' ? 'edit' : 'select'),
    check: (s) => s.mode === 'edit' && s.page >= 2,
  },
  {
    title: 'HOME',
    body: 'Te regresa al osciloscopio desde cualquier modo. Ahí ves la onda que estás tocando.',
    task: 'Presiona HOME',
    target: 'home',
    check: (s) => s.mode === 'home',
  },
  {
    title: 'ARP',
    body: 'El arpegiador toca solas las notas que sostienes, una tras otra.',
    task: 'Presiona ARP y deja apretada una tecla',
    target: (s) => (!s.arp.on ? 'arp' : 'key-7'),
    check: (s) => s.arp.on && s.held.length > 0,
  },
  {
    title: 'Apaga el ARP',
    body: 'Se apaga presionando ARP otra vez mientras estás en su pantalla.',
    task: 'Presiona ARP',
    target: 'arp',
    check: (s) => !s.arp.on,
  },
  {
    title: 'SEQ',
    body: 'El secuenciador guarda 16 pasos. Con REC, cada nota que tocas ocupa el siguiente paso.',
    task: 'Presiona SEQ, luego REC, y toca 4 notas',
    target: (s) => (!s.seq.on ? 'seq' : !s.seq.recording ? 'rec' : ['key-7', 'key-11', 'key-14', 'key-19'][Math.min(3, filled(s))]),
    check: (s) => s.seq.on && filled(s) >= 4,
  },
  {
    title: 'Escúchalo',
    body: 'Presiona REC otra vez para dejar de grabar: el patrón sigue sonando. Los pasos se ven en las teclas blancas.',
    task: 'Presiona REC',
    target: (s) => (s.seq.recording ? 'rec' : s.seq.on && !s.seq.playing ? 'play' : 'rec'),
    check: (s) => s.seq.on && s.seq.playing && !s.seq.recording,
  },
  {
    title: 'PLAY/STOP',
    body: 'Arranca y detiene el patrón. Solo funciona con el SEQ activo.',
    task: 'Detén el patrón',
    target: 'play',
    check: (s) => !s.seq.playing,
  },
  {
    title: 'SAVE',
    body: 'Lo que cambias se pierde al cambiar de sonido. Mantén SAVE presionado para guardarlo.',
    task: 'Mantén SAVE',
    target: 'save',
    check: (s) => s.saving,
  },
  {
    title: '¡Ya conoces el FM-1!',
    body: 'Viste todas sus partes. Ve a Tocar para jugar libre, o regresa a Aprender y elige una canción.',
    target: null,
  },
]
