// Medidas tomadas de la foto de producto (vista superior) y del manual:
// 161.5 × 96.5 mm → el chasis mide 840 × 500 unidades de diseño.
// Todas las coordenadas son el CENTRO del control, en esas unidades.

export const BODY = { w: 840, h: 500, radius: 34 }

export type KnobId =
  | 'master' | 'select' | 'presets' | 'algorithm'
  | 'knob1' | 'knob2' | 'knob3' | 'knob4'

export interface KnobSpec { id: KnobId; label: string; x: number; y: number; labelY: number; endless: boolean }

export const KNOBS: KnobSpec[] = [
  { id: 'master', label: 'MASTER', x: 67, y: 77, labelY: 38, endless: false },
  { id: 'select', label: 'SELECT', x: 157, y: 77, labelY: 38, endless: true },
  { id: 'presets', label: 'PRESETS', x: 67, y: 165, labelY: 126, endless: true },
  { id: 'algorithm', label: 'ALGORITHM', x: 157, y: 165, labelY: 126, endless: true },
  { id: 'knob1', label: 'KNOB1', x: 473, y: 77, labelY: 38, endless: true },
  { id: 'knob2', label: 'KNOB2', x: 568, y: 77, labelY: 38, endless: true },
  { id: 'knob3', label: 'KNOB3', x: 663, y: 77, labelY: 38, endless: true },
  { id: 'knob4', label: 'KNOB4', x: 758, y: 77, labelY: 38, endless: true },
]

export const KNOB_SIZE = 38

export type ButtonId =
  | 'fx' | 'sel' | 'env' | 'lfo' | 'edit' | 'glo'
  | 'home' | 'save' | 'arp' | 'seq' | 'play' | 'rec'
  | 'octDown' | 'octUp'

export interface ButtonSpec { id: ButtonId; label: string; x: number; y: number; w: number; h: number; red?: boolean }

const BTN = 42
const COLS = [485, 538, 591, 644, 697, 749]
const ROWS = [170, 224]

export const BUTTONS: ButtonSpec[] = [
  ...(['FX', 'SEL', 'ENV', 'LFO', 'EDIT', 'GLO'] as const).map((label, i) => ({
    id: label.toLowerCase() as ButtonId, label, x: COLS[i], y: ROWS[0], w: BTN, h: BTN,
  })),
  { id: 'home', label: 'HOME', x: COLS[0], y: ROWS[1], w: BTN, h: BTN },
  { id: 'save', label: 'SAVE', x: COLS[1], y: ROWS[1], w: BTN, h: BTN },
  { id: 'arp', label: 'ARP', x: COLS[2], y: ROWS[1], w: BTN, h: BTN },
  { id: 'seq', label: 'SEQ', x: COLS[3], y: ROWS[1], w: BTN, h: BTN },
  { id: 'play', label: 'PLAY/STOP', x: COLS[4], y: ROWS[1], w: BTN, h: BTN, red: true },
  { id: 'rec', label: 'REC', x: COLS[5], y: ROWS[1], w: BTN, h: BTN, red: true },
  { id: 'octDown', label: 'OCT-', x: 87, y: 235, w: 54, h: 32, red: true },
  { id: 'octUp', label: 'OCT+', x: 147, y: 235, w: 54, h: 32, red: true },
]

/** Bandejas hundidas donde viven los botones y el teclado. */
export const TRAYS = [
  { x: 42, y: 212, w: 140, h: 46, r: 10 },   // OCT−/OCT+
  { x: 448, y: 137, w: 338, h: 120, r: 14 }, // botones de función
  { x: 28, y: 285, w: 784, h: 184, r: 30 },  // teclado
]

export const SCREEN = {
  bezel: { x: 215, y: 35, w: 200, h: 200, r: 20 },
  lcd: { x: 240, y: 62, w: 150, h: 150, r: 6 },
}

// ── Teclado: 27 teclas, F3–G5 (MIDI 53–79 con octava 0) ─────────────────
export const BASE_NOTE = 53
export const KEY_W = 40
export const KEY_H = 76

const WHITE_X0 = 64
const WHITE_STEP = 47.47
const WHITE_Y = 417
const BLACK_Y = 336

/** Índice cromático (0–26) de las teclas "blancas" y "negras" del FM-1. */
export const WHITE_IDX = [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 18, 19, 21, 23, 24, 26]
const BLACK_IDX = [1, 3, 5, 8, 10, 13, 15, 17, 20, 22, 25]
const BLACK_LABELS = ['OP1', 'OP2', 'OP3', 'OP4', 'OP5', 'OP6', 'PIT', 'GLO', 'MONO', 'POLY', '']

export interface KeySpec { index: number; x: number; y: number; black: boolean; label: string }

export const KEYS: KeySpec[] = [
  ...WHITE_IDX.map((index, i) => ({ index, x: WHITE_X0 + i * WHITE_STEP, y: WHITE_Y, black: false, label: '' })),
  ...BLACK_IDX.map((index, i) => {
    // la tecla negra queda a la mitad entre sus dos vecinas blancas
    const left = WHITE_IDX.indexOf(index - 1)
    return { index, x: WHITE_X0 + (left + 0.5) * WHITE_STEP, y: BLACK_Y, black: true, label: BLACK_LABELS[i] }
  }),
].sort((a, b) => a.index - b.index)

/** Puntitos que marcan los cortes B–C y E–F (donde no hay tecla negra). */
export const OCTAVE_DOTS = [3.5, 6.5, 10.5, 13.5].map((i) => ({ x: WHITE_X0 + i * WHITE_STEP, y: 376 }))
