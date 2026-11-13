import { useEffect, useState } from 'react'
import { startRecording, stopRecording } from '../audio/engine'
import { useFM1 } from '../fm1/store'
import { download, dx7Bank, safeName } from '../fm1/syx'

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * Llévate lo que haces: grabar lo que suena a WAV (para tu DAW) o el sonido
 * como banco de DX7 (.syx) para Dexed, un DX7 o el FM-1 de verdad.
 */
export function ExportBar() {
  const [since, setSince] = useState<number | null>(null)
  const [now, setNow] = useState(0)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (since === null) return
    const t = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(t)
  }, [since])

  useEffect(() => {
    if (!note) return
    const t = setTimeout(() => setNote(null), 4000)
    return () => clearTimeout(t)
  }, [note])

  const toggleRec = async () => {
    if (since === null) {
      await startRecording()
      setSince(Date.now())
      setNow(Date.now())
      setNote(null)
      return
    }
    setSince(null)
    const wav = await stopRecording()
    if (!wav) return setNote('No se grabó nada.')
    const s = useFM1.getState()
    download(wav, `fm1-${safeName(s.patch.name)}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '')}.wav`)
    setNote('Listo: el WAV está en tus descargas.')
  }

  const exportSyx = () => {
    const s = useFM1.getState()
    // tu sonido en la voz 1 y los 31 presets que le siguen
    const rest = Array.from({ length: 31 }, (_, i) => s.bank[(s.presetIndex + 1 + i) % s.bank.length])
    download(dx7Bank([s.patch, ...rest]), `fm1-${safeName(s.patch.name)}.syx`, 'application/octet-stream')
    setNote('Banco DX7 descargado. Tu sonido es la voz 1. Los efectos no viajan en el .syx.')
  }

  const recording = since !== null
  return (
    <div className="export">
      <button type="button" className={`export-btn ${recording ? 'is-rec' : ''}`} onClick={toggleRec} title="Graba lo que suena, con efectos, para tu DAW">
        <span className="export-dot" />
        {recording ? `Detener ${clock(now - since)}` : 'Grabar WAV'}
      </button>
      <button type="button" className="export-btn" onClick={exportSyx} title="Banco DX7 para Dexed, un DX7 o el FM-1">
        <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
          <path d="M10 3v10m-4-4l4 4 4-4M4 16h12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Sonido .syx
      </button>
      <p className="export-note" aria-live="polite">
        {note ?? ''}
      </p>
    </div>
  )
}
