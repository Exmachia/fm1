import type { ButtonSpec } from './layout'
import { useFM1 } from '../fm1/store'
import { buttonLed } from '../fm1/leds'
import { BUTTON_ID, useEmu } from '../emu/emu'
import { buttonDown, buttonUp } from './route'

/** Botón de silicón. Su LED ilumina la etiqueta desde atrás. */
export function PadButton({ spec }: { spec: ButtonSpec }) {
  const emu = useEmu((s) => s.status !== 'off')
  const ownPressed = useFM1((s) => s.pressedButtons.has(spec.id))
  const ownLed = useFM1((s) => buttonLed(s, spec.id))
  const ownStop = useFM1((s) => buttonLed(s, 'stop'))
  // con un firmware de la comunidad, el LED lo decide él (PLAY/STOP comparten uno)
  const emuPressed = useEmu((s) => s.pressed.has(BUTTON_ID[spec.id]))
  const emuLed = useEmu((s) => (s.leds[BUTTON_ID[spec.id]] ? 'on' : 'off'))
  const pressed = emu ? emuPressed : ownPressed
  const led = emu ? emuLed : ownLed
  const stopLed = emu ? 'off' : ownStop
  const down = buttonDown
  const up = buttonUp
  const isPressed = () => (emu ? useEmu.getState().pressed.has(BUTTON_ID[spec.id]) : useFM1.getState().pressedButtons.has(spec.id))

  const cls = ['pad', spec.red ? 'pad-red' : '', pressed ? 'is-pressed' : ''].join(' ')
  const label =
    spec.id === 'play' ? (
      <span className="pad-label pad-label-stack">
        <span className={`led-text led-${led}`}>PLAY</span>
        <span className="pad-rule" />
        <span className={`led-text led-${stopLed}`}>STOP</span>
      </span>
    ) : (
      <span className={`pad-label led-text led-${led}`}>{spec.label}</span>
    )

  return (
    <button
      type="button"
      className={cls}
      aria-label={spec.label}
      aria-pressed={pressed}
      style={{ left: spec.x - spec.w / 2, top: spec.y - spec.h / 2, width: spec.w, height: spec.h }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        down(spec.id)
      }}
      onPointerUp={() => pressed && up(spec.id)}
      onPointerCancel={() => pressed && up(spec.id)}
      onLostPointerCapture={() => isPressed() && up(spec.id)}
      onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && !e.repeat && down(spec.id)}
      onKeyUp={(e) => (e.key === ' ' || e.key === 'Enter') && up(spec.id)}
      onContextMenu={(e) => e.preventDefault()}
      data-control={spec.id}
    >
      {label}
    </button>
  )
}
