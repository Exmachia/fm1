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
    tags: ['6-op FM', 'Loops'],
    aphex: 'The FM pianos of SAW II',
    about: 'A real DX7 (Dexed) with loops you record live.',
    download: latest('zvenson/dxsloop'),
    repo: gh('zvenson/dxsloop'),
    license: 'GPL-3.0',
  },
  {
    id: 'frodhes',
    package: `${HUB}fw/frodhes-0.9.8.fwsc`,
    name: 'Frodhes',
    author: 'Leonardo Mirabal',
    tags: ['Rhodes', 'Electric piano'],
    aphex: 'Slow pieces like “Avril 14th”',
    about: 'A modeled Rhodes electric piano, no samples.',
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
    aphex: 'The odd tunings of Syro',
    about: 'Microtonal scales, a Casio CZ-1 and a DX7.',
    download: latest('keremimo/melodee'),
    repo: gh('keremimo/melodee'),
    license: 'GPL-3.0',
  },
  {
    id: 'amb',
    package: `${HUB}fw/amb-1.3.fwsc`,
    name: 'AMB-1',
    author: 'Charles Vestal',
    tags: ['Ambient', 'Generative'],
    aphex: 'His ambient side',
    about: 'Self-playing ambient, inspired by Brian Eno.',
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
    aphex: 'The acid of Analord',
    about: '909, 808, two 303s and breaks.',
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
    aphex: 'The drums of the Richard D. James Album',
    about: 'Eight classic breaks chopped across the white keys.',
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
    aphex: '90s IDM',
    about: 'A tracker with a DX7, Juno-106 and 303 together.',
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
    aphex: 'The noisy stuff, like “Come to Daddy”',
    about: 'IDM and industrial in the style of the Elektron Digitone.',
    download: HUB,
    repo: gh('nzimas/bigorna'),
    license: 'GPL-3.0',
  },
  {
    id: 'kittenrack',
    package: `${HUB}fw/kittenrack-1.3.0.fwsc`,
    name: 'Kitten Rack',
    author: 'Black Kitten Devices',
    tags: ['Modular', 'Random'],
    aphex: 'His weirdest experiments',
    about: 'A modular with 50 modules and random generators.',
    download: latest('BlackKittenDevices/kitten-rack'),
    repo: gh('BlackKittenDevices/kitten-rack'),
    license: 'GPL-3.0',
  },
]
