// El thumbnail para compartir: el aparato de verdad (el mismo componente del
// sitio), al centro, con el aro azul de las lecciones sobre un acorde y dos
// textos chiquitos en sus esquinas.

import { createRoot } from 'react-dom/client'
import { Device } from '../src/device/Device'
import { useFM1 } from '../src/fm1/store'
import { useCoach } from '../src/learn/coachStore'
import { keysFor } from '../src/learn/lesson'
import '../src/styles.css'
import './og.css'

// E.PIANO 1, el sonido de la lección; la pantalla de ENV (se ve mejor que la
// línea plana del osciloscopio) y Re menor señalado en el teclado
useFM1.getState().turn('presets', 4)
useFM1.getState().buttonDown('env')
useFM1.getState().buttonUp('env')
useCoach.getState().setTarget(keysFor(useFM1.getState(), [62, 65, 69]))

function Card() {
  return (
    <main className="og">
      {/* la retícula del sitio, tocando los bordes del aparato */}
      <span className="og-line og-v og-l" />
      <span className="og-line og-v og-r" />
      <span className="og-line og-h og-t" />
      <span className="og-line og-h og-b" />
      <div className="og-device">
        <Device />
      </div>
      <p className="og-label og-top">FM-1 Synthesizer</p>
      <p className="og-label og-bottom">Learn to play it in your browser</p>
      <div className="grain" />
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<Card />)
