// Qué LED está prendido, según el estado del firmware (manual págs. 2, 6–10).

import { BASE_NOTE, WHITE_IDX, type ButtonId } from '../device/layout'
import { COMBO_KEYS, type FM1State } from './store'

export type LedState = 'off' | 'on' | 'blink' | 'blinkFast'

/** LED de octava: ±1 lento, ±2 rápido, ±3 fijo (del lado del signo). */
const octLed = (o: number): LedState => (o === 0 ? 'off' : Math.abs(o) === 1 ? 'blink' : Math.abs(o) === 2 ? 'blinkFast' : 'on')

export function buttonLed(s: FM1State, id: ButtonId | 'stop'): LedState {
  switch (id) {
    case 'fx':
    case 'env':
    case 'lfo':
    case 'edit':
    case 'glo':
      return s.mode === id ? 'on' : 'off'
    case 'sel':
      return s.mode === 'fx' && s.fxGrabbed ? 'on' : 'off'
    case 'home':
      return s.bt === 'on' ? 'blink' : 'off' // BT encendido sin conexión
    case 'save':
      return s.saving ? 'on' : 'off'
    case 'arp':
      return s.arp.on ? 'on' : 'off'
    case 'seq':
      return s.seq.on ? 'on' : 'off'
    case 'play':
      return s.seq.on && (s.seq.playing || s.seq.recording) ? 'on' : 'off'
    case 'stop':
      return s.seq.on && !s.seq.playing && !s.seq.recording ? 'on' : 'off'
    case 'rec':
      return s.seq.recording ? 'on' : 'off'
    case 'octDown':
      return s.octave < 0 ? octLed(s.octave) : 'off'
    case 'octUp':
      return s.octave > 0 ? octLed(s.octave) : 'off'
  }
}

export function keyLed(s: FM1State, i: number): LedState {
  if (s.pressedKeys.has(i)) return 'on'

  const combo = COMBO_KEYS[i]
  if (s.mode === 'edit' && combo) {
    if (combo === 'MONO') return s.voiceMode === 'mono' ? 'on' : 'blink'
    if (combo === 'POLY') return s.voiceMode === 'poly' ? 'on' : 'blink'
    const selected =
      (combo.startsWith('OP') && s.section === Number(combo[2]) - 1) ||
      (combo === 'PIT' && s.section === 'pit') ||
      (combo === 'GLO' && s.section === 'glo')
    return selected ? 'on' : 'blink'
  }

  // con el SEQ activo, las 16 teclas blancas son los 16 pasos
  if (s.seq.on) {
    const step = WHITE_IDX.indexOf(i)
    if (step >= 0) {
      if ((s.seq.playing || s.seq.recording) && s.seq.step === step) return 'blinkFast'
      if (s.seq.recording && s.seq.recPos === step) return 'blink'
      if (s.seq.patterns[s.seq.pattern][step].length) return 'on'
      return 'off'
    }
  }

  // notas que está tocando el ARP o el SEQ
  const note = BASE_NOTE + i + s.octave * 12 + s.transpose
  return s.sounding.includes(note) ? 'on' : 'off'
}
