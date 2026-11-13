// Firmwares de la comunidad para el FM-1 que más se acercan a la música de
// Aphex Twin. No los alojamos: "Descargar" lleva a la página de cada autor y
// "Probar" abre el emulador de Joakim Eriksson (fm1-emu) con ese firmware.
// Catálogo de origen: https://github.com/joakimeriksson/fm1-emu y thefirmwarehub.com

export interface Firmware {
  /** Id del emulador (`?fw=`) y del Hub. */
  id: string
  /** Paquete .fwsc conocido (si el catálogo del emulador da uno más nuevo, se usa ese). */
  package: string
  name: string
  author: string
  /** Etiquetas cortas de estilo. */
  tags: string[]
  /** A qué parte de Aphex Twin se parece. */
  aphex: string
  /** Qué es, en una frase corta. */
  about: string
  /** Página de descarga (releases del autor, o el Hub si no tiene). */
  download: string
  /** Código fuente. */
  repo: string
  license: string
}

const gh = (repo: string) => `https://github.com/${repo}`
const latest = (repo: string) => `${gh(repo)}/releases/latest`

export const HUB = 'https://thefirmwarehub.com/'
export const EMU_SITE = 'https://joakimeriksson.github.io/fm1-emu/'

export const FIRMWARES: Firmware[] = [
  {
    id: 'sloopdx',
    package: `${HUB}fw/sloopdx-4.0.1.fwsc`,
    name: 'sloopDX',
    author: 'zvenson',
    tags: ['FM 6 operadores', 'Loops'],
    aphex: 'Pianos FM de SAW II',
    about: 'Un DX7 de verdad (Dexed) con loops que grabas en vivo.',
    download: latest('zvenson/dxsloop'),
    repo: gh('zvenson/dxsloop'),
    license: 'GPL-3.0',
  },
  {
    id: 'frodhes',
    package: `${HUB}fw/frodhes-0.9.8.fwsc`,
    name: 'Frodhes',
    author: 'Leonardo Mirabal',
    tags: ['Rhodes', 'Piano eléctrico'],
    aphex: 'Piezas lentas tipo «Avril 14th»',
    about: 'Piano eléctrico Rhodes modelado, sin samples.',
    download: latest('leonardoMirabal/frodhes'),
    repo: gh('leonardoMirabal/frodhes'),
    license: 'GPL-3.0',
  },
  {
    id: 'melodee',
    package: `${HUB}fw/melodee-1.6.1.fwsc`,
    name: 'Melodee',
    author: 'keremimo',
    tags: ['Microtonal', 'FM'],
    aphex: 'Las afinaciones raras de Syro',
    about: 'Escalas microtonales, un Casio CZ-1 y un DX7.',
    download: latest('keremimo/melodee'),
    repo: gh('keremimo/melodee'),
    license: 'GPL-3.0',
  },
  {
    id: 'amb',
    package: `${HUB}fw/amb-1.3.fwsc`,
    name: 'AMB-1',
    author: 'Charles Vestal',
    tags: ['Ambient', 'Generativo'],
    aphex: 'Su lado ambient',
    about: 'Ambient que se toca solo, inspirado en Brian Eno.',
    download: latest('charlesvestal/fm1-amb'),
    repo: gh('charlesvestal/fm1-amb'),
    license: 'MPL-2.0',
  },
  {
    id: 'x0x',
    package: `${HUB}fw/x0x-1.2.0.fwsc`,
    name: 'X0X',
    author: 'Charles Vestal',
    tags: ['Acid', '303', '909'],
    aphex: 'El acid de Analord',
    about: '909, 808, dos 303 y breaks.',
    download: latest('charlesvestal/fm1-x0x'),
    repo: gh('charlesvestal/fm1-x0x'),
    license: 'GPL-3.0',
  },
  {
    id: 'choppah',
    package: `${HUB}fw/choppah-0.96.fwsc`,
    name: 'CHOPPAH',
    author: 'profikid',
    tags: ['Breaks', 'Drill’n’bass'],
    aphex: 'Las baterías del Richard D. James Album',
    about: 'Ocho breaks clásicos cortados en las teclas blancas.',
    download: latest('profikid/fm1-break-choppah'),
    repo: gh('profikid/fm1-break-choppah'),
    license: 'MPL-2.0',
  },
  {
    id: 'ptfm',
    package: `${HUB}fw/ptfm-0.26+91deae9e.fwsc`,
    name: 'PT/FM',
    author: 'hitosu',
    tags: ['Tracker', 'DX7 + 303'],
    aphex: 'El IDM de los 90',
    about: 'Tracker con DX7, Juno-106 y 303 juntos.',
    download: latest('hitosu/ptfm'),
    repo: gh('hitosu/ptfm'),
    license: 'GPL-3.0',
  },
  {
    id: 'bigorna',
    package: `${HUB}fw/bigorna-2026.11.03+87baea1d.fwsc`,
    name: 'Bigorna',
    author: 'Nuno Zimas',
    tags: ['IDM', 'Industrial'],
    aphex: 'Lo ruidoso, tipo «Come to Daddy»',
    about: 'IDM e industrial al estilo Elektron Digitone.',
    download: HUB,
    repo: gh('nzimas/bigorna'),
    license: 'GPL-3.0',
  },
  {
    id: 'kittenrack',
    package: `${HUB}fw/kittenrack-1.3.0.fwsc`,
    name: 'Kitten Rack',
    author: 'Black Kitten Devices',
    tags: ['Modular', 'Azar'],
    aphex: 'Sus experimentos más raros',
    about: 'Modular con 50 módulos y generadores al azar.',
    download: latest('BlackKittenDevices/kitten-rack'),
    repo: gh('BlackKittenDevices/kitten-rack'),
    license: 'GPL-3.0',
  },
]
