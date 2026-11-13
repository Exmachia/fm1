// A dónde van las perillas, botones y teclas: a nuestro firmware (el FM-1 de
// fábrica que modelamos) o al firmware de la comunidad que esté corriendo en
// el emulador. Así el mismo aparato sirve para los dos.

import { useFM1 } from '../fm1/store'
import { BUTTON_ID, emuActive, emuKey, emuTurn, keyId } from '../emu/emu'
import type { ButtonId, KnobId } from './layout'

export const turn = (id: KnobId, det: number) => (emuActive() ? emuTurn(id, det) : useFM1.getState().turn(id, det))
export const buttonDown = (id: ButtonId) => (emuActive() ? emuKey(BUTTON_ID[id], true) : useFM1.getState().buttonDown(id))
export const buttonUp = (id: ButtonId) => (emuActive() ? emuKey(BUTTON_ID[id], false) : useFM1.getState().buttonUp(id))
export const keyDown = (i: number) => (emuActive() ? emuKey(keyId(i), true) : useFM1.getState().keyDown(i))
export const keyUp = (i: number) => (emuActive() ? emuKey(keyId(i), false) : useFM1.getState().keyUp(i))

