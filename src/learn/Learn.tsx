import { useMemo, useRef, useState } from 'react'
import { Coach } from './Coach'
import { APHEX } from './lessons/aphex'
import { INTRO } from './intro'
import { lessonFromSong, loadSongs, parseMidi, saveSongs, songFromNotes, type MidiTrack, type Song } from './midi'
import type { Lesson } from './lesson'

const CURRENT_KEY = 'fm1.learn.current'
const stepKey = (id: string) => `fm1.learn.${id}.step`

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
const write = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key)
    else localStorage.setItem(key, value)
  } catch {
    /* sin almacenamiento */
  }
}

/** Archivo leído, esperando a que elijas pista y modo. */
interface Draft { title: string; tracks: MidiTrack[]; track: number; melody: boolean }

/** El recorrido por las partes del aparato (antes era su propia pestaña). */
const TOUR: Lesson = {
  id: 'intro',
  title: 'Conoce el FM-1',
  subtitle: 'Qué hace cada perilla, botón y tecla',
  steps: INTRO,
}
const TOUR_KEY = 'fm1.intro.step'
const keyOf = (id: string) => (id === TOUR.id ? TOUR_KEY : stepKey(id))

/** Vista Aprender: elige conocer el aparato o aprender una canción. */
export function Learn({ onPlay }: { onPlay: () => void }) {
  const [songs, setSongs] = useState<Song[]>(loadSongs)
  const [current, setCurrent] = useState<string | null>(() => read(CURRENT_KEY))
  const [draft, setDraft] = useState<Draft | null>(null)
  const [error, setError] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)

  const lessons: Lesson[] = useMemo(() => [APHEX, ...songs.map(lessonFromSong)], [songs])
  const lesson = [TOUR, ...lessons].find((l) => l.id === current)

  const open = (id: string | null) => {
    setCurrent(id)
    write(CURRENT_KEY, id)
  }

  if (lesson) {
    return (
      <Coach
        key={lesson.id}
        steps={lesson.steps}
        storeKey={keyOf(lesson.id)}
        finishLabel={lesson === TOUR ? 'Ir a Tocar' : 'Volver a lecciones'}
        onFinish={() => {
          write(keyOf(lesson.id), null)
          open(null)
          if (lesson === TOUR) onPlay()
        }}
        onExit={() => open(null)}
      />
    )
  }

  const onFile = async (f: File | undefined) => {
    setError(null)
    if (!f) return
    try {
      const tracks = parseMidi(await f.arrayBuffer())
      if (!tracks.length) throw new Error('Ese archivo no tiene notas que tocar')
      // por omisión, la pista con más notas
      const track = tracks.reduce((best, t, i) => (t.notes.length > tracks[best].notes.length ? i : best), 0)
      setDraft({ title: f.name.replace(/\.(mid|midi|kar)$/i, ''), tracks, track: tracks.length > 1 ? track : 0, melody: true })
    } catch (e) {
      setError(e instanceof Error && e.message !== 'No es un archivo MIDI' ? e.message : 'Ese archivo no parece MIDI (.mid).')
    } finally {
      if (file.current) file.current.value = ''
    }
  }

  const create = () => {
    if (!draft) return
    const notes = draft.track < 0 ? draft.tracks.flatMap((t) => t.notes) : draft.tracks[draft.track].notes
    const song = songFromNotes(draft.title.trim() || 'Mi canción', notes, draft.melody)
    const next = [...songs, song]
    setSongs(next)
    saveSongs(next)
    setDraft(null)
    open(song.id)
  }

  const remove = (id: string) => {
    const next = songs.filter((s) => s.id !== id)
    setSongs(next)
    saveSongs(next)
    write(stepKey(id), null)
  }

  const status = (l: Lesson) => {
    const n = Number(read(keyOf(l.id))) || 0
    return n > 0 ? `Paso ${n + 1} de ${l.steps.length}` : `${l.steps.length} pasos`
  }

  if (!draft) {
    return (
      <section className="tiles" aria-label="¿Qué quieres hacer?">
        <h2 className="tiles-title">¿Qué quieres hacer?</h2>
        <ul className="tiles-grid">
          {[TOUR, ...lessons].map((l) => (
            <li key={l.id}>
              <button type="button" className={`tile ${l === TOUR ? 'is-tour' : ''}`} onClick={() => open(l.id)}>
                <span className="tile-kind">{l === TOUR ? 'Conocer' : 'Canción'}</span>
                <b>{l.title}</b>
                <small>{status(l)}</small>
              </button>
              {l !== TOUR && l.id !== APHEX.id && (
                <button type="button" className="tile-remove" aria-label={`Quitar ${l.title}`} onClick={() => remove(l.id)}>
                  <svg viewBox="0 0 20 20" width="12" height="12" aria-hidden="true">
                    <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                  </svg>
                </button>
              )}
            </li>
          ))}
          <li>
            <button type="button" className="tile is-add" onClick={() => file.current?.click()}>
              <span className="tile-kind">MIDI</span>
              <b>+ Importar</b>
              <small>{error ?? 'Tu propia canción'}</small>
            </button>
            <input ref={file} type="file" accept=".mid,.midi,.kar,audio/midi,audio/x-midi" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </li>
        </ul>
      </section>
    )
  }

  return (
    <aside className="coach picker">
      <div className="coach-body">
        <h2 className="coach-title">Nueva lección</h2>
        <p className="coach-text">Elige qué parte del archivo quieres aprender. Con "solo la melodía" tocas una nota a la vez.</p>
      </div>

      {draft && (
        <div className="picker-form">
          <label>
            <span>Nombre</span>
            <input value={draft.title} maxLength={40} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
          </label>
          {draft.tracks.length > 1 && (
            <label>
              <span>Pista</span>
              <select value={draft.track} onChange={(e) => setDraft({ ...draft, track: Number(e.target.value) })}>
                {draft.tracks.map((t, i) => (
                  <option key={i} value={i}>
                    {t.name} · {t.notes.length} notas
                  </option>
                ))}
                <option value={-1}>Todas juntas</option>
              </select>
            </label>
          )}
          <label className="picker-check">
            <input type="checkbox" checked={draft.melody} onChange={(e) => setDraft({ ...draft, melody: e.target.checked })} />
            <span>Solo la melodía (la nota más aguda)</span>
          </label>
          <div className="coach-foot">
            <span className="coach-spacer" />
            <button type="button" className="coach-ghost" onClick={() => setDraft(null)}>
              Cancelar
            </button>
            <button type="button" className="coach-cta" onClick={create}>
              Crear lección
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
