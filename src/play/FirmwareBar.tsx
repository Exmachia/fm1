import { startFirmware, stopFirmware, useEmu } from '../emu/emu'

const LABEL = { off: '', loading: 'Descargando…', booting: 'Arrancando…', running: 'Corriendo', error: 'No arrancó' }

/** Abajo a la derecha, en Tocar: qué firmware de la comunidad corre y cómo volver al de fábrica. */
export function FirmwareBar() {
  const fw = useEmu((s) => s.fw)
  const status = useEmu((s) => s.status)
  const error = useEmu((s) => s.error)
  if (!fw) return null
  return (
    <div className="export">
      {error && <p className="export-note">{error}</p>}
      <span className={`fw-now is-${status}`}>
        <span className="fw-now-dot" />
        <b>{fw.name}</b>
        <span>{LABEL[status]}</span>
      </span>
      {status === 'error' && (
        <button type="button" className="export-btn" onClick={() => void startFirmware(fw)}>
          Reintentar
        </button>
      )}
      <button type="button" className="export-btn" onClick={stopFirmware}>
        Volver al FM-1
      </button>
    </div>
  )
}
