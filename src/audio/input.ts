// Entradas además del mouse: teclado de la computadora y Web MIDI.

import { useFM1 } from '../fm1/store'
import * as route from '../device/route'
import { emuActive, emuMidi, useEmu } from '../emu/emu'

/**
 * Fila del medio = teclas blancas, fila de arriba = negras, empezando en el
 * Do (C4, la 8.ª tecla del FM-1). Z / X = OCT− / OCT+.
 */
const KEYMAP: Record<string, number> = {
  KeyA: 7, KeyW: 8, KeyS: 9, KeyE: 10, KeyD: 11, KeyF: 12, KeyT: 13, KeyG: 14,
  KeyY: 15, KeyH: 16, KeyU: 17, KeyJ: 18, KeyK: 19, KeyO: 20, KeyL: 21, KeyP: 22,
  Semicolon: 23, Quote: 24,
}
const BUTTONS: Record<string, 'octDown' | 'octUp'> = { KeyZ: 'octDown', KeyX: 'octUp' }

export function bindComputerKeyboard() {
  const typing = (e: KeyboardEvent) =>
    e.metaKey || e.ctrlKey || e.altKey ||
    (e.target instanceof HTMLElement && (e.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)))

  const down = (e: KeyboardEvent) => {
    if (e.repeat || typing(e)) return
    if (e.code in KEYMAP) {
      route.keyDown(KEYMAP[e.code])
      e.preventDefault()
    } else if (e.code in BUTTONS) {
      route.buttonDown(BUTTONS[e.code])
      e.preventDefault()
    }
  }
  const up = (e: KeyboardEvent) => {
    if (e.code in KEYMAP) route.keyUp(KEYMAP[e.code])
    else if (e.code in BUTTONS) route.buttonUp(BUTTONS[e.code])
  }
  // si la ventana pierde el foco, soltamos todo para que no se quede pegada una nota
  const blur = () => {
    const s = useFM1.getState()
    s.pressedKeys.forEach((i) => s.keyUp(i))
    useEmu.getState().pressed.forEach((id) => id >= 14 && route.keyUp(id - 14))
  }
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('blur', blur)
}

export type MidiStatus = 'off' | 'on' | 'unsupported' | 'denied'

/** Pide acceso MIDI (el navegador puede preguntar) y escucha todas las entradas. */
export async function enableMidi(): Promise<MidiStatus> {
  if (!('requestMIDIAccess' in navigator)) return 'unsupported'
  try {
    const access = await navigator.requestMIDIAccess()
    const listen = (input: MIDIInput) => {
      input.onmidimessage = (msg) => {
        const d = msg.data
        if (!d) return
        // con un firmware de la comunidad corriendo, el MIDI entra tal cual a su jack
        if (emuActive()) return emuMidi([...d])
        if (d.length < 3) return
        const cmd = d[0] & 0xf0
        const s = useFM1.getState()
        if (cmd === 0x90 && d[2] > 0) s.externalNote(d[1], d[2], true)
        else if (cmd === 0x80 || (cmd === 0x90 && d[2] === 0)) s.externalNote(d[1], 0, false)
      }
    }
    access.inputs.forEach(listen)
    access.onstatechange = (e) => {
      const port = (e as MIDIConnectionEvent).port
      if (port && port.type === 'input' && port.state === 'connected') listen(port as MIDIInput)
    }
    return 'on'
  } catch {
    return 'denied'
  }
}
