import { useLayoutEffect, useRef, useState } from 'react'
import { BODY, BUTTONS, KNOBS, TRAYS } from './layout'
import { Knob } from './Knob'
import { PadButton } from './PadButton'
import { Keyboard } from './Keyboard'
import { Screen } from './Screen'
import { Halo } from './Halo'

/** Qué fracción de la celda ocupa el aparato: aire alrededor en pantallas
 *  grandes, casi todo el ancho en el celular para que las teclas se puedan tocar. */
const FILL_WIDE = 0.86
const FILL_NARROW = 0.94
const MAX_SCALE = 1.5
/** Aire entre el aparato y el panel de abajo. */
const GAP = 16

/**
 * El FM-1 completo. Se dibuja a 840×500 y se escala para caber (ancho y
 * alto) en el espacio que le den, centrado a lo ancho y pegado abajo.
 */
export function Device() {
  const wrap = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ w: BODY.w, h: BODY.h })

  useLayoutEffect(() => {
    const el = wrap.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setBox({ w: width, h: height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const fill = box.w < 640 ? FILL_NARROW : FILL_WIDE
  const scale = Math.max(0.1, Math.min(MAX_SCALE, (box.w * fill) / BODY.w, (box.h - GAP * 2) / BODY.h))
  const left = (box.w - BODY.w * scale) / 2
  // pegado abajo, junto al panel: así no se mueve aunque cambie la tarjeta
  const top = Math.max(GAP, box.h - BODY.h * scale - GAP)

  return (
    <div ref={wrap} className="device-wrap">
      <div
        className="device"
        style={{ width: BODY.w, height: BODY.h, borderRadius: BODY.radius, transform: `translate(${left}px, ${top}px) scale(${scale})` }}
      >
        {TRAYS.map((t, i) => (
          <div key={i} className="tray" style={{ left: t.x, top: t.y, width: t.w, height: t.h, borderRadius: t.r }} />
        ))}
        <Screen />
        {KNOBS.map((k) => <Knob key={k.id} spec={k} />)}
        {BUTTONS.map((b) => <PadButton key={b.id} spec={b} />)}
        <Keyboard />
        <Halo />
      </div>
    </div>
  )
}
