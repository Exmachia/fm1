// El thumbnail para compartir: el aparato de verdad (el mismo componente del
// sitio), al centro y sin nada encima, con dos textos chiquitos en sus esquinas.

import { createRoot } from 'react-dom/client'
import { Device } from '../src/device/Device'
import { useFM1 } from '../src/fm1/store'
import '../src/styles.css'
import './og.css'

// E.PIANO 1 y la pantalla de ENV (se ve mejor que la línea plana del osciloscopio)
useFM1.getState().turn('presets', 4)
useFM1.getState().buttonDown('env')
useFM1.getState().buttonUp('env')

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
