import { useRef } from 'react'
import { KNOB_SIZE, type KnobSpec } from './layout'
import { useFM1 } from '../fm1/store'
import { useEmu } from '../emu/emu'
import { turn } from './route'

const PX_PER_DETENT = 7

/** Encoder (giro infinito) o potenciómetro de 300° (MASTER). */
export function Knob({ spec }: { spec: KnobSpec }) {
  const emu = useEmu((s) => s.status !== 'off')
  const ownAngle = useFM1((s) => (spec.endless ? s.angles[spec.id] : -150 + s.master * 300))
  const emuAngle = useEmu((s) => (spec.endless ? s.angles[spec.id] : -150 + s.master * 300))
  const angle = emu ? emuAngle : ownAngle
  const drag = useRef<{ y: number; acc: number } | null>(null)

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { y: e.clientY, acc: 0 }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    d.acc += d.y - e.clientY
    d.y = e.clientY
    const steps = Math.trunc(d.acc / PX_PER_DETENT)
    if (steps !== 0) {
      d.acc -= steps * PX_PER_DETENT
      turn(spec.id, steps)
    }
  }
  const end = () => (drag.current = null)

  // el trackpad manda muchos eventos chiquitos: acumulamos hasta un "clic"
  const wheel = useRef(0)
  const onWheel = (e: React.WheelEvent) => {
    wheel.current -= e.deltaMode === 1 ? e.deltaY * 30 : e.deltaY
    const steps = Math.trunc(wheel.current / 30)
    if (steps !== 0) {
      wheel.current -= steps * 30
      turn(spec.id, Math.sign(steps))
    }
  }
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowRight') turn(spec.id, 1)
    else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') turn(spec.id, -1)
    else return
    e.preventDefault()
  }

  return (
    <>
      <span className="panel-label" style={{ left: spec.x, top: spec.labelY }}>{spec.label}</span>
      <div
        className="knob"
        role="slider"
        aria-label={spec.label}
        aria-valuenow={Math.round(angle)}
        tabIndex={0}
        style={{ left: spec.x - KNOB_SIZE / 2, top: spec.y - KNOB_SIZE / 2, width: KNOB_SIZE, height: KNOB_SIZE }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
        onWheel={onWheel}
        onKeyDown={onKeyDown}
        data-control={spec.id}
      >
        <div className="knob-cap" style={{ transform: `rotate(${angle}deg)` }}>
          <div className="knob-mark" />
        </div>
      </div>
    </>
  )
}
