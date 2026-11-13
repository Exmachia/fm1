import { startFirmware, stopFirmware, useEmu } from '../emu/emu'

const LABEL = { off: '', loading: 'Downloading…', booting: 'Booting…', running: 'Running', error: 'Failed to boot' }

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
          Retry
        </button>
      )}
      <button type="button" className="export-btn" onClick={stopFirmware}>
        Back to FM-1
      </button>
    </div>
  )
}
