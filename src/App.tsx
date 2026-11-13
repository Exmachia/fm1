import { useState } from 'react'
import { Device } from './device/Device'
import { enableMidi, type MidiStatus } from './audio/input'
import { Learn } from './learn/Learn'
import { Firmwares } from './firmwares/Firmwares'
import { ExportBar } from './play/ExportBar'
import { FirmwareBar } from './play/FirmwareBar'
import { startFirmware, stopFirmware, useEmu } from './emu/emu'

type View = 'learn' | 'play' | 'firmware'

const MIDI_LABEL: Record<MidiStatus, string> = {
  off: 'Conectar MIDI',
  on: 'MIDI conectado',
  unsupported: 'MIDI no disponible',
  denied: 'MIDI bloqueado',
}

const VIEW_KEY = 'fm1.view'
const loadView = (): View => {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    return v === 'play' || v === 'firmware' ? v : 'learn' // la vieja 'intro' ahora vive dentro de Aprender
  } catch {
    return 'learn'
  }
}

const TABS: [View, string][] = [
  ['learn', 'Aprender'],
  ['play', 'Tocar'],
  ['firmware', 'Firmwares'],
]

/**
 * Retícula 3×3: las bandas de los bordes son delgadas y la celda central es
 * para el sintetizador (arriba, siempre en el mismo lugar) y su panel (abajo).
 */
export function App() {
  const [midi, setMidi] = useState<MidiStatus>('off')
  const [view, setViewState] = useState<View>(loadView)
  const emu = useEmu((s) => s.status !== 'off')
  const setView = (v: View) => {
    // las lecciones son del FM-1 de fábrica: al salir de Tocar se apaga el firmware de la comunidad
    if (v === 'learn') stopFirmware()
    setViewState(v)
    try {
      localStorage.setItem(VIEW_KEY, v)
    } catch {
      /* sin almacenamiento */
    }
  }

  return (
    <main className={`stage view-${view}`}>
      <span className="gline gline-v1" aria-hidden="true" />
      <span className="gline gline-v2" aria-hidden="true" />
      <span className="gline gline-h1" aria-hidden="true" />
      <span className="gline gline-h2" aria-hidden="true" />

      <header className="topbar">
        <div className="topbar-left">
          <span className="brand">FM-1</span>
          <button
            type="button"
            className={`chip ${midi === 'on' ? 'is-on' : ''}`}
            onClick={async () => setMidi(await enableMidi())}
            disabled={midi === 'on' || midi === 'unsupported'}
          >
            <span className="chip-dot" />
            {MIDI_LABEL[midi]}
          </button>
        </div>
        <nav className="views" aria-label="Vistas">
          {TABS.map(([id, label]) => (
            <button key={id} type="button" className={view === id ? 'is-active' : ''} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>

      {view === 'firmware' ? (
        <section className="device-area is-catalog">
          <Firmwares
            onTry={(f) => {
              void startFirmware(f)
              setView('play')
            }}
          />
        </section>
      ) : (
        <section className="device-area">
          <div className="device-slot">
            <Device />
          </div>
          <div className="panel">{view === 'learn' && <Learn onPlay={() => setView('play')} />}</div>
          {view === 'play' && (emu ? <FirmwareBar /> : <ExportBar />)}
          {view === 'play' && (
            <p className="hint">
              Teclado: <kbd>A</kbd>–<kbd>Ñ</kbd> blancas · <kbd>W</kbd> <kbd>E</kbd> <kbd>T</kbd>… negras · <kbd>Z</kbd> <kbd>X</kbd> octava
            </p>
          )}
        </section>
      )}

      <div className="grain" aria-hidden="true" />
    </main>
  )
}
