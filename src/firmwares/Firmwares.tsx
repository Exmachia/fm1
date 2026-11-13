import { EMU_SITE, FIRMWARES, HUB, type Firmware } from './catalog'

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const

/** Catálogo de firmwares cercanos a Aphex Twin. "Probar" lo carga en nuestro aparato. */
export function Firmwares({ onTry }: { onTry: (f: Firmware) => void }) {
  return (
    <section className="fw">
      <header className="fw-head">
        <h2>Firmwares</h2>
        <p>Sistemas de la comunidad que convierten el FM-1 en otro instrumento. Estos son los más cercanos a Aphex Twin.</p>
        <details className="fw-how">
          <summary>¿Cómo se instalan?</summary>
          <ol>
            <li>
              En Chrome o Edge, conecta el FM-1 por USB y abre{' '}
              <a href={HUB} {...ext}>
                The Firmware Hub
              </a>
              .
            </li>
            <li>Presiona «Connect FM-1» y luego «Install» en el firmware. Tarda como un minuto.</li>
            <li>Respalda tus sonidos antes. Para volver al original, usa «Back to official V15» en el mismo sitio.</li>
          </ol>
          <p>Son proyectos de sus autores, sin garantía: los instalas bajo tu propio riesgo.</p>
        </details>
      </header>

      <ul className="fw-list">
        {FIRMWARES.map((f) => (
          <li key={f.id} className="fw-row">
            <div className="fw-main">
              <div className="fw-name">
                <h3>{f.name}</h3>
                <a className="fw-author" href={f.repo} {...ext} title={`Código fuente · ${f.license}`}>
                  {f.author}
                </a>
              </div>
              <p className="fw-about">{f.about}</p>
            </div>
            <p className="fw-aphex">
              <span>Suena a</span> {f.aphex}
            </p>
            <div className="fw-actions">
              <button type="button" className="fw-btn is-try" onClick={() => onTry(f)}>
                <svg viewBox="0 0 20 20" width="11" height="11" aria-hidden="true">
                  <path d="M6 4.5v11l9-5.5z" fill="currentColor" />
                </svg>
                Probar
              </button>
              <a className="fw-btn" href={f.download} {...ext} aria-label={`Descargar ${f.name}`} title={f.download === HUB ? 'Descargar desde The Firmware Hub' : 'Descargar'}>
                <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
                  <path d="M10 3v10m-4-4l4 4 4-4M4 16h12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </li>
        ))}
      </ul>
      <p className="fw-credit">
        «Probar» corre el firmware real en tu FM-1 de aquí, con el emulador{' '}
        <a href={EMU_SITE} {...ext}>
          fm1-emu
        </a>{' '}
        de Joakim Eriksson. Cada firmware se baja de la página de su autor.
      </p>
    </section>
  )
}
