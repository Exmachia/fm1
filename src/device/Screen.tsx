import { useEffect, useRef } from 'react'
import { SCREEN } from './layout'
import { LCD, paintScreen } from './screen/paint'
import { useFM1 } from '../fm1/store'
import { readLcd, useEmu } from '../emu/emu'

const STATUS: Record<string, string> = { loading: 'Descargando', booting: 'Arrancando', error: 'No arrancó' }

/** Pinta la pantalla del firmware de la comunidad (RGB565) o su estado mientras carga. */
function paintEmu(ctx: CanvasRenderingContext2D, off: { canvas: HTMLCanvasElement; img: ImageData; version: number }) {
  const { lcd, version } = readLcd()
  const emu = useEmu.getState()
  if (lcd) {
    if (version !== off.version) {
      const d = off.img.data
      for (let i = 0; i < lcd.length; i++) {
        const p = lcd[i]
        d[i * 4] = ((p >> 11) * 255) / 31
        d[i * 4 + 1] = (((p >> 5) & 63) * 255) / 63
        d[i * 4 + 2] = ((p & 31) * 255) / 31
        d[i * 4 + 3] = 255
      }
      off.canvas.getContext('2d')?.putImageData(off.img, 0, 0)
      off.version = version
    }
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(off.canvas, 0, 0, LCD, LCD)
    return
  }
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, LCD, LCD)
  ctx.fillStyle = emu.status === 'error' ? '#ff6b5e' : '#e8e6df'
  ctx.textAlign = 'center'
  ctx.font = '700 17px "IBM Plex Mono", monospace'
  ctx.fillText(emu.fw?.name ?? '', LCD / 2, LCD / 2 - 8)
  ctx.font = '500 12px "IBM Plex Mono", monospace'
  const dots = '.'.repeat(1 + (Math.floor(performance.now() / 400) % 3))
  ctx.fillText(emu.status === 'error' ? STATUS.error : `${STATUS[emu.status] ?? ''}${dots}`, LCD / 2, LCD / 2 + 16)
}

const SUPERSAMPLE = 3

/** TFT de 1.54" (240×240). Se repinta en cada cuadro a partir del firmware. */
export function Screen() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const ctx = ref.current?.getContext('2d')
    if (!ctx) return
    let raf = 0
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 240
    const off = { canvas, img: new ImageData(240, 240), version: -1 }
    const frame = (now: number) => {
      ctx.setTransform(SUPERSAMPLE, 0, 0, SUPERSAMPLE, 0, 0)
      if (useEmu.getState().status !== 'off') paintEmu(ctx, off)
      else paintScreen(ctx, useFM1.getState(), now)
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  const { bezel, lcd } = SCREEN
  return (
    <>
      <div className="bezel" style={{ left: bezel.x, top: bezel.y, width: bezel.w, height: bezel.h, borderRadius: bezel.r }} />
      <canvas
        ref={ref}
        className="lcd"
        width={LCD * SUPERSAMPLE}
        height={LCD * SUPERSAMPLE}
        style={{ left: lcd.x, top: lcd.y, width: lcd.w, height: lcd.h, borderRadius: lcd.r }}
        aria-label="Pantalla del FM-1"
      />
      <div className="glass" style={{ left: lcd.x, top: lcd.y, width: lcd.w, height: lcd.h, borderRadius: lcd.r }} />
    </>
  )
}
