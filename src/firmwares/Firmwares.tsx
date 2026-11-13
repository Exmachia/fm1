import { EMU_SITE, FIRMWARES, HUB, type Firmware } from './catalog'

const ext = { target: '_blank', rel: 'noopener noreferrer' } as const

/** Catálogo de firmwares cercanos a Aphex Twin. "Probar" lo carga en nuestro aparato. */
export function Firmwares({ onTry }: { onTry: (f: Firmware) => void }) {
  return (
    <section className="fw">
      <header className="fw-head">
        <h2>Firmwares</h2>
        <p>Community firmwares that turn the FM-1 into another instrument. These are the closest to Aphex Twin.</p>
        <details className="fw-how">
          <summary>How do I install them?</summary>
          <ol>
            <li>
              In Chrome or Edge, connect the FM-1 over USB and open{' '}
              <a href={HUB} {...ext}>
                The Firmware Hub
              </a>
              .
            </li>
            <li>Click “Connect FM-1”, then “Install” on the firmware. It takes about a minute.</li>
            <li>Back up your sounds first. To go back to the original, use “Back to official V15” on the same site.</li>
          </ol>
          <p>These are their authors’ projects, with no warranty: install them at your own risk.</p>
        </details>
      </header>

      <ul className="fw-list">
        {FIRMWARES.map((f) => (
          <li key={f.id} className="fw-row">
            <div className="fw-main">
              <div className="fw-name">
                <h3>{f.name}</h3>
                <a className="fw-author" href={f.repo} {...ext} title={`Source code · ${f.license}`}>
                  {f.author}
                </a>
              </div>
              <p className="fw-about">{f.about}</p>
            </div>
            <p className="fw-aphex">
              <span>Sounds like</span> {f.aphex}
            </p>
            <div className="fw-actions">
              <button type="button" className="fw-btn is-try" onClick={() => onTry(f)}>
                <svg viewBox="0 0 20 20" width="11" height="11" aria-hidden="true">
                  <path d="M6 4.5v11l9-5.5z" fill="currentColor" />
                </svg>
                Try
              </button>
              <a className="fw-btn" href={f.download} {...ext} aria-label={`Download ${f.name}`} title={f.download === HUB ? 'Download from The Firmware Hub' : 'Download'}>
                <svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true">
                  <path d="M10 3v10m-4-4l4 4 4-4M4 16h12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </a>
            </div>
          </li>
        ))}
      </ul>
      <p className="fw-credit">
        “Try” runs the real firmware on the FM-1 here, using the{' '}
        <a href={EMU_SITE} {...ext}>
          fm1-emu
        </a>{' '}
        emulator by Joakim Eriksson. Each firmware is downloaded from its author’s page.
      </p>
    </section>
  )
}
