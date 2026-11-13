import { BASE_NOTE, BUTTONS, KEYS, KEY_H, KEY_W, KNOBS, KNOB_SIZE, SCREEN } from './layout'
import { useCoach } from '../learn/coachStore'
import { useFM1 } from '../fm1/store'
import { solfeo } from '../learn/lesson'

/** Rectángulo (en unidades del aparato) del control con ese `data-control`. */
function geometry(id: string): { x: number; y: number; w: number; h: number; r: number } | null {
  if (id === 'screen') {
    const b = SCREEN.bezel
    return { x: b.x, y: b.y, w: b.w, h: b.h, r: b.r }
  }
  const knob = KNOBS.find((k) => k.id === id)
  if (knob) return { x: knob.x - KNOB_SIZE / 2, y: knob.y - KNOB_SIZE / 2, w: KNOB_SIZE, h: KNOB_SIZE, r: KNOB_SIZE }
  const btn = BUTTONS.find((b) => b.id === id)
  if (btn) return { x: btn.x - btn.w / 2, y: btn.y - btn.h / 2, w: btn.w, h: btn.h, r: 10 }
  if (id.startsWith('key-')) {
    const k = KEYS.find((x) => x.index === Number(id.slice(4)))
    if (k) return { x: k.x - KEY_W / 2, y: k.y - KEY_H / 2, w: KEY_W, h: KEY_H, r: 20 }
  }
  return null
}

/** Letra del teclado de la compu para cada tecla (ver audio/input.ts). */
const LETTER: Record<number, string> = {
  7: 'A', 8: 'W', 9: 'S', 10: 'E', 11: 'D', 12: 'F', 13: 'T', 14: 'G', 15: 'Y', 16: 'H',
  17: 'U', 18: 'J', 19: 'K', 20: 'O', 21: 'L', 22: 'P', 23: ';', 24: "'",
}

/** Aros que laten alrededor de los controles que el guía te pide usar. */
export function Halo() {
  const targets = useCoach((s) => s.targets)
  const shift = useFM1((s) => s.octave * 12 + s.transpose)
  const pad = 7
  return (
    <>
      {targets.map((id) => {
        const g = geometry(id)
        if (!g) return null
        const key = id.startsWith('key-') ? Number(id.slice(4)) : null
        return (
          <div
            key={id}
            className="halo"
            aria-hidden="true"
            style={{ left: g.x - pad, top: g.y - pad, width: g.w + pad * 2, height: g.h + pad * 2, borderRadius: g.r + pad }}
          >
            {key !== null && (
              <span className="halo-tag">
                {solfeo(BASE_NOTE + key + shift)}
                {LETTER[key] && <kbd>{LETTER[key]}</kbd>}
              </span>
            )}
          </div>
        )
      })}
    </>
  )
}
