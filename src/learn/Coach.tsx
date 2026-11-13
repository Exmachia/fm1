import { useEffect, useRef, useState } from 'react'
import { onPlayed, useFM1, type FM1State } from '../fm1/store'
import { useCoach } from './coachStore'
import { evenDemo, keysFor, playDemo, type Step, type Target } from './lesson'

const PRAISE = ['¡Eso!', '¡Bien!', '¡Perfecto!', '¡Así se hace!', '¡Muy bien!']

const loadStep = (key: string, max: number) => {
  try {
    return Math.min(max, Number(localStorage.getItem(key)) || 0)
  } catch {
    return 0
  }
}

interface Props {
  steps: Step[]
  /** Dónde se recuerda en qué paso ibas. */
  storeKey: string
  onFinish: () => void
  finishLabel: string
  /** Botón para salir (en Aprender, regresa a la lista de lecciones). */
  onExit?: () => void
}

/**
 * Tarjeta del guía: un paso a la vez. Ilumina el control (o la tecla que
 * sigue), espera a que lo pruebes y celebra cuando lo logras. Sin puntos,
 * rachas ni vidas: equivocarte solo te avisa.
 */
export function Coach({ steps, storeKey, onFinish, finishLabel, onExit }: Props) {
  const [index, setIndex] = useState(() => loadStep(storeKey, steps.length - 1))
  const [done, setDone] = useState(false)
  const [progress, setProgress] = useState(0)
  const [miss, setMiss] = useState(0)
  const [listening, setListening] = useState(false)
  const stopDemo = useRef<(() => void) | null>(null)
  const start = useRef<FM1State>(useFM1.getState())
  const step = steps[index]
  const last = index === steps.length - 1
  const follow = step.follow
  const needsAction = !!step.check || !!follow
  const demo = step.demo ?? (follow ? evenDemo(follow, 450) : undefined)

  // al entrar a un paso: guardamos cómo estaba todo para comparar después
  useEffect(() => {
    start.current = useFM1.getState()
    setDone(false)
    setProgress(0)
    try {
      localStorage.setItem(storeKey, String(index))
    } catch {
      /* sin almacenamiento: no pasa nada */
    }

    let finished = false
    let pos = 0 // grupo que toca
    let got = new Set<number>() // notas del grupo que ya tocaste

    const resolveTarget = (s: FM1State) => {
      if (finished) return
      let t: Target = typeof step.target === 'function' ? step.target(s) : step.target ?? null
      if (follow && t == null) t = keysFor(s, follow[pos].filter((n) => !got.has(n)))
      useCoach.getState().setTarget(t)
    }
    const succeed = () => {
      finished = true
      setDone(true)
      useCoach.getState().setTarget(null)
      navigator.vibrate?.(15)
    }
    resolveTarget(useFM1.getState())
    // si ya estaba hecho (por ejemplo, la octava ya está donde pide), cuenta
    if (step.check && !follow && step.check(start.current, start.current)) succeed()

    const unsubState = useFM1.subscribe((s) => {
      resolveTarget(s)
      if (!finished && step.check && !follow && step.check(s, start.current)) succeed()
    })
    const unsubPlayed = follow
      ? onPlayed((note) => {
          if (finished) return
          const group = follow[pos]
          if (!group.includes(note)) {
            setMiss(Date.now())
            return
          }
          got.add(note)
          if (group.every((n) => got.has(n))) {
            pos++
            got = new Set()
            setProgress(pos)
            if (pos >= follow.length) return succeed()
          }
          resolveTarget(useFM1.getState())
        })
      : () => {}

    return () => {
      unsubState()
      unsubPlayed()
      stopDemo.current?.()
      useCoach.getState().setTarget(null)
    }
  }, [index, step, follow, storeKey])

  // el aviso de "esa no" dura un momento
  useEffect(() => {
    if (!miss) return
    const t = setTimeout(() => setMiss(0), 900)
    return () => clearTimeout(t)
  }, [miss])

  const next = () => (last ? onFinish() : setIndex(index + 1))
  const canContinue = !needsAction || done

  const toggleDemo = () => {
    if (stopDemo.current) return stopDemo.current()
    if (!demo) return
    setListening(true)
    stopDemo.current = playDemo(demo, () => {
      stopDemo.current = null
      setListening(false)
    })
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && canContinue && !(e.target instanceof HTMLButtonElement)) next()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const showDots = follow && follow.length <= 24

  return (
    <aside className={`coach ${done ? 'is-done' : ''} ${miss ? 'is-miss' : ''}`} aria-live="polite">
      <div className="coach-progress" aria-hidden="true">
        <span style={{ width: `${((index + (done ? 1 : 0)) / (steps.length - 1)) * 100}%` }} />
      </div>
      <div className="coach-body">
        <div className="coach-head">
          <h2 className="coach-title">{step.title}</h2>
          {onExit && (
            <button type="button" className="coach-exit" onClick={onExit} aria-label="Salir a las lecciones">
              <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        <p className="coach-text">{step.body}</p>
        {follow && (
          <div className="coach-notes" aria-label={`${progress} de ${follow.length} notas`}>
            {showDots ? (
              follow.map((_, i) => (
                <span key={i} className={i < progress ? 'is-hit' : i === progress && !done ? 'is-next' : ''} />
              ))
            ) : (
              <b>
                {progress} / {follow.length}
              </b>
            )}
          </div>
        )}
      </div>
      <div className="coach-foot">
        {needsAction && !done && (
          <span className="coach-task">
            <span className="coach-pulse" />
            {miss ? 'Esa no. Busca la tecla azul' : step.task ?? 'Toca las teclas azules'}
          </span>
        )}
        {done && (
          <span className="coach-praise">
            <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
              <path d="M4 10.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {PRAISE[index % PRAISE.length]}
          </span>
        )}
        <span className="coach-spacer" />
        {demo && (
          <button type="button" className={`coach-ghost coach-listen ${listening ? 'is-on' : ''}`} onClick={toggleDemo}>
            <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
              {listening ? <rect x="5" y="5" width="10" height="10" rx="1.5" fill="currentColor" /> : <path d="M6 4.5v11l9-5.5z" fill="currentColor" />}
            </svg>
            {listening ? 'Detener' : 'Escuchar'}
          </button>
        )}
        {index > 0 && (
          <button type="button" className="coach-ghost" onClick={() => setIndex(index - 1)}>
            Atrás
          </button>
        )}
        {needsAction && !done && (
          <button type="button" className="coach-ghost" onClick={next}>
            Saltar
          </button>
        )}
        <button type="button" className="coach-cta" disabled={!canContinue} onClick={next}>
          {index === 0 ? 'Empezar' : last ? finishLabel : 'Continuar'}
        </button>
      </div>
    </aside>
  )
}
