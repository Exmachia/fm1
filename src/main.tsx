import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { useFM1 } from './fm1/store'
import { armAudioOnFirstGesture } from './audio/engine'
import { bindComputerKeyboard } from './audio/input'
import * as emu from './emu/emu'
import * as route from './device/route'
import './styles.css'

// en desarrollo, todo queda a mano en la consola: fm1.getState(), emu.useEmu.getState(), route.keyDown(7)
if (import.meta.env.DEV) Object.assign(window, { fm1: useFM1, emu, route })

armAudioOnFirstGesture()
bindComputerKeyboard()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
