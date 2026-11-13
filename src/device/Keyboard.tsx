import { KEYS, KEY_H, KEY_W, OCTAVE_DOTS, type KeySpec } from './layout'
import { useFM1 } from '../fm1/store'
import { keyLed } from '../fm1/leds'
import { keyId, useEmu } from '../emu/emu'
import { keyDown, keyUp } from './route'

/**
 * Tecla de silicón con su ranura de LED. Se puede deslizar el dedo o el
 * mouse de una tecla a otra (glissando): por eso soltamos la captura del
 * puntero y usamos enter/leave.
 */
function Key({ k }: { k: KeySpec }) {
  const emu = useEmu((s) => s.status !== 'off')
  const ownLed = useFM1((s) => keyLed(s, k.index))
  const ownPressed = useFM1((s) => s.pressedKeys.has(k.index))
  const emuLed = useEmu((s) => (s.leds[keyId(k.index)] ? 'on' : 'off'))
  const emuPressed = useEmu((s) => s.pressed.has(keyId(k.index)))
  const led = emu ? emuLed : ownLed
  const pressed = emu ? emuPressed : ownPressed

  return (
    <div
      className={`key ${pressed ? 'is-pressed' : ''} ${led !== 'off' ? 'is-lit' : ''}`}
      style={{ left: k.x - KEY_W / 2, top: k.y - KEY_H / 2, width: KEY_W, height: KEY_H }}
      data-control={`key-${k.index}`}
      onPointerDown={(e) => {
        e.currentTarget.releasePointerCapture(e.pointerId)
        keyDown(k.index)
      }}
      onPointerEnter={(e) => e.buttons & 1 && keyDown(k.index)}
      onPointerUp={() => keyUp(k.index)}
      onPointerLeave={() => keyUp(k.index)}
      onPointerCancel={() => keyUp(k.index)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className={`key-slit led-${led}`} />
      {k.label && <span className="key-label">{k.label}</span>}
    </div>
  )
}

export function Keyboard() {
  return (
    <>
      {OCTAVE_DOTS.map((d, i) => (
        <span key={i} className="key-dot" style={{ left: d.x - 2, top: d.y - 2 }} />
      ))}
      {KEYS.map((k) => <Key key={k.index} k={k} />)}
    </>
  )
}
