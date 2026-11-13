# FM-1 · aprende a tocarlo

Réplica interactiva del **M-VAVE FM-1** en el navegador para aprender a usarlo antes de comprarlo y durante el aprendizaje.
Fuente de verdad: manual oficial (sección English, págs. 1–13) → <https://m.media-amazon.com/images/I/A1WOydif9HL.pdf>

---

## 1. Qué es el FM-1 (resumen del manual)

- Sintetizador FM de **6 operadores** (estilo DX7, acepta bancos SysEx de DX7), **32 algoritmos**, 12 voces de polifonía (modo MONO / POLY).
- **128 presets** (001–128). Pantalla **TFT de 1.54"** (cuadrada, ~240×240).
- **27 teclas** de silicón, de F3 a G5 por defecto (16 blancas + 11 negras), con LED por tecla.
- 8 encoders: MASTER (volumen, 300°), SELECT, PRESETS, ALGORITHM, KNOB1–4.
- 12 botones: FX · SEL · ENV · LFO · EDIT · GLO / HOME · SAVE · ARP · SEQ · PLAY/STOP · REC. Más OCT− y OCT+.
- Medidas: 161.5 × 96.5 × 28.6 mm → proporción del chasis **1.674 : 1**.

### Pantalla (3 zonas)
| Zona | Contenido |
|---|---|
| Barra superior | número + nombre del preset (`001 PIANO 1`) + icono de batería |
| Centro | contenido del modo: osciloscopio (línea amarilla sobre gris), cuadrícula de FX 3×2, cajas ENV con barras, diagrama de algoritmo… |
| Barra inferior | modo + página (`1/2 LFO`) o valor del parámetro (`CutOff: 1004Hz`, `Type: Low Pass`) |

Popups de ~1 s: lista de voces, diagrama de algoritmo, `Octave X`, `Transpose X`, `Volume X`, `Preset Saved`, `Disable SEQ to enter`, `Disable ARP to enter`, `Enable SEQ first`.

### Controles por modo (lo que mostrará la pantalla)
| Modo | Pág. | Knob 1 | Knob 2 | Knob 3 | Knob 4 |
|---|---|---|---|---|---|
| FX (Filter/Reverb) | – | Type | Param 1 | Param 2 | On/Off |
| FX (Delay/Dist/Chorus/Phaser) | – | Param 1 | Param 2 | Param 3 | On/Off |
| ENV | – | Attack 0–8 | Decay 0–8 | Sustain 0–8 | Release 0–8 |
| LFO | 1 | Wave | Speed 0–99 | PMD 0–99 | AMD 0–99 |
| LFO | 2 | Delay 0–99 | Pitch Sens 0–7 | Lfo Sync 0–1 | Osc Sync 0–1 |
| EDIT · OP1–6 | 1 | Rate 1–4 (0–99) | | | |
| EDIT · OP1–6 | 2 | Level 1–4 (0–99) | | | |
| EDIT · OP1–6 | 3 | Detune 0–14 | FreqCoarse 0–31 | FreqFine 0–99 | OscMode Ratio/Fixed |
| EDIT · OP1–6 | 4 | A ModSens 0–3 | KeyVelocity 0–7 | Out Level 0–99 | |
| EDIT · OP1–6 | 5 | L Depth 0–99 | R Depth 0–99 | BreakPoint A-1–C7 | |
| EDIT · OP1–6 | 6 | L Curve | R Curve | RateScale 0–7 | |
| EDIT · PIT | 1–2 | Rate 1–4 / Level 1–4 | | | |
| EDIT · GLO | – | Algorithm | Feedback 0–7 | Osc Sync | Transpose |
| GLO | 1 | Note Ch 1–16 | Effect Ch 1–16 | PB Up 1–24 | PB Down 1–24 |
| GLO | 2 | Reset Patches | Globe Save | – | – |
| ARP | 1 | Mode | Octave 1–4 | Rate | Tempo 30–300 |
| ARP | 2 | Gate 20–100% | Swing 50–75% | Latch | – |
| SEQ | 1 | Pattern 1–16 | Clear | Rate | Tempo 30–300 |
| SEQ | 2 | Gate 20–100% | Swing 50–75% | – | – |

FX: Filter (LP/BP/HP, CutOff 100–20 000 Hz, Q 0–100) · Reverb (Room/Hall/Plate, Decay, Mix) · Delay (Decay, Rate, Mix) · Distortion (Gain, Tone, Level) · Chorus y Phaser (Freq, Depth, Mix). SEL + SELECT reordena la cadena.
ARP: Up, Down, Inclusive, Exclusive, Order, Repeat, Random. SEQ: 16 pasos, 16 patrones, REC graba nota por paso.

### Teclas negras = funciones en EDIT
F#3 **OP1** · G#3 **OP2** · A#3 **OP3** · C#4 **OP4** · D#4 **OP5** · F#4 **OP6** · G#4 **PIT** · A#4 **GLO** · C#5 **MONO** · D#5 **POLY** · F#5 (sin etiqueta)

---

## 2. Decisiones tomadas

- **Look:** mismo layout que el aparato real, **chasis blanco**, teclas y botones **negros**; en **rojo**: PLAY/STOP, REC, OCT−, OCT+.
- **Pantalla:** se comporta como la real (los mismos modos, páginas, popups y textos del manual).
- **Sensación de juego tipo Duolingo, sin niveles:** sin XP, rachas ni vidas. Lo que sí tomamos: un paso a la vez, respuesta inmediata (✓ verde con sonido, vibración suave si te equivocas), la siguiente perilla o tecla se ilumina y celebra cuando la logras.
- **Tres vistas:**
  1. **Intro**: recorrido que te presenta cada parte del aparato, una por una. Se ilumina el control, una frase corta dice qué hace y tú lo pruebas para avanzar.
  2. **Aprender**: lecciones guiadas paso a paso (sonido → técnica → canción).
  3. **Tocar**: solo el aparato y el visualizador, sin guía, para tocar libremente.
- **Primera lección: Aphex Twin.** Ver punto 4.

---

## 3. Arquitectura

- **Stack:** Vite + React + TypeScript, sin backend. Deploy en Vercel.
- **Estado del aparato:** un solo store (Zustand) que modela el firmware: modo actual, página, preset, octava, transpose, LEDs, ARP/SEQ, etc. La UI y la pantalla solo lo leen. Esto hace que las lecciones puedan "esperar" a que el estado cumpla una condición (p. ej. `mode === 'EDIT' && op === 3 && page === 3`).
- **Pantalla:** `<canvas>` de 240×240 escalado con pixelado nítido, tipografía bitmap, con un render por modo (Home/osciloscopio, FX grid, ENV barras, LFO, EDIT, GLO, ARP, SEQ, popups).
- **Sonido:** motor FM de 6 operadores en **AudioWorklet** con los 32 algoritmos de DX7, envolventes rate/level de 4 etapas, feedback, LFO, pitch envelope, 12 voces y cadena de FX reordenable. Lee y escribe patches en formato DX7 (los mismos parámetros del manual).
- **Entrada:** mouse/touch sobre el aparato, teclado de la computadora (fila A-S-D… = teclas blancas, W-E-T… = negras) y **Web MIDI** (sirve con teclado MIDI y, cuando lo compres, con el FM-1 real por USB).
- **Presets:** el manual no trae la lista de los 128 nombres. Solo conocemos `001 PIANO 1` (foto) y `032 BRASS 1` (manual). Haremos un banco propio de sonidos con nombres en el mismo formato y dejaremos espacio para importar bancos DX7 (.syx).
- **Lecciones como datos:** cada lección es una lista de pasos `{instrucción, control a iluminar, condición para pasar}`, así se agregan lecciones sin tocar código.

---

## 4. Lección de Aphex Twin

No puedo meter una canción con derechos de autor nota por nota dentro de la app. Propuesta en dos partes:

1. **Lección "Al estilo Aphex Twin"** (incluida): construyes un piano/bell FM melancólico como en *Selected Ambient Works* / *Avril 14th* (algoritmo, ratios, envolventes, reverb). Luego tocas una pieza original con su técnica: arpegio lento en la mano izquierda, melodía suelta arriba, tempo libre. Después la grabas en el SEQ.
2. **Importar MIDI**: puedes cargar un archivo `.mid` de la canción que quieras (una partitura o MIDI que tú consigas). La app lo convierte en lección: ilumina qué tecla sigue y espera a que la toques.

**Cómo quedó (fase 5):**
- La pieza se llama «Nieve tibia» (`src/learn/lessons/aphex.ts`): Re menor · Fa · Do · La menor/Mi, 4 notas por acorde = los 16 pasos del SEQ. Se toca con E.PIANO 1 (005), Release ≥ 5, Reverb Mix ≥ 60 %, Rate 1/8 y Tempo ≤ 100. La melodía va en la octava +1. Todo cae en teclas blancas y dentro de las letras A–Ñ.
- Pasos con `follow` (`src/learn/lesson.ts`): el aro señala la tecla que sigue con su nombre (Re, Fa…) y su letra; si la nota no cabe, señala OCT− u OCT+. Una nota equivocada sacude la tarjeta y no se cuenta, sin castigo. "Escuchar" toca la demo sin que cuente como tuya.
- Importador (`src/learn/midi.ts`): lee formatos 0 y 1 con mapa de tempo, quita el canal 10 (batería), junta lo que empieza a menos de 40 ms (acordes), busca la octava que deja más notas dentro de las 27 teclas y dobla el resto. Parte la canción en frases de 8 y, si tiene 64 notas o menos, agrega "Toda junta". Ofrece elegir pista y "solo la melodía". Guarda las canciones en el navegador (`fm1.songs.v1`).

---

## 4b. Firmwares y exportar (pedido después de la fase 5)

- **Pestañas:** Aprender (dentro eliges «Conoce el FM-1» o una canción) · Tocar · Firmwares. El aparato ocupa el mismo lugar en Aprender y Tocar: arriba de una fila fija para la tarjeta o los botones (`.device-area`, `--panel`). Se quitaron las letras japonesas.
- **Firmwares** (`src/firmwares/catalog.ts`): sloopDX, Frodhes, Melodee, AMB-1, X0X, CHOPPAH, PT/FM, Bigorna y Kitten Rack. No se alojan: «Descargar» lleva a los releases del autor (Bigorna, al Hub porque no tiene releases). Se instalan con thefirmwarehub.com (Chrome/Edge + Web MIDI).
- **Probar en nuestro aparato** (`src/emu/emu.ts`): «Probar» corre el firmware real dentro de NUESTRO FM-1 con el motor de fm1-emu de Joakim Eriksson (MIT). En `public/emu/` están fijados `worklet.js` y `fm1_web.wasm` (3.4 MB), copiados del sitio del emulador el 2026-11-13, junto con su LICENSE. El .fwsc se baja al momento: primero el del catálogo del emulador y, si el Hub ya lo borró, el que lista `thefirmwarehub.com/catalog.json`. `src/device/route.ts` manda perillas, botones, teclas y MIDI al emulador o a nuestro firmware. Mapa de controles: botones 0–13 (OCT−, OCT+, FX, SEL, ENV, LFO, EDIT, GLO, HOME, SAVE, ARP, SEQ, PLAY, REC), teclas 14+i, encoders SELECT 0, ALGORITHM 1, KNOB1–4 2–5, PRESETS 6; MASTER es el pot (0–1023). La pantalla llega en RGB565 240×240 y los LEDs como 41 fracciones. Los guardados del firmware no se conservan entre sesiones (falta persistir el flash).
- **Exportar** (vista Tocar): «Grabar WAV» graba la salida con efectos (24 bits estéreo, worklet `fm1-recorder`). «Exportar sonido (.syx)» baja un banco DX7 de 32 voces: tu sonido en la voz 1 y los 31 presets siguientes; lo abren Dexed, un DX7 y el FM-1. Los FX y el ADSR global del FM-1 no viajan en el .syx.

## 5. Fases

| # | Fase | Entregable | Modelo |
|---|---|---|---|
| 0 | Investigación ✅ | Este documento | Opus 5.5 |
| 1 ✅ | Aparato visual | Chasis blanco a escala, perillas que giran, botones con LED, 27 teclas; responsive | Opus 5.5 |
| 2 ✅ | Firmware + pantalla | Store con todos los modos y la pantalla de canvas mostrando lo mismo que el real | Opus 5.5 |
| 3 ✅ | Motor de sonido | FM 6-op con 32 algoritmos, FX, ARP, SEQ, teclado de compu + Web MIDI | Opus 5.5 |
| 4 ✅ | Intro + Tocar | Recorrido guiado por cada control + vista libre con visualizador | Opus 5.5 |
| 5 ✅ | Aprender | Motor de lecciones, lección Aphex Twin, importador MIDI | Opus 5.5 |
| 5b ✅ | Firmwares + exportar | Pestaña Firmwares (9 de la comunidad, cercanos a Aphex Twin, con prueba en fm1-emu), WAV y .syx de DX7; Intro dentro de Aprender; aparato fijo | Opus 5.5 |
| 6 | Pulido y deploy | Prueba en móvil, sonido en iOS, Vercel | Sonnet 5.5 |

Ajustes chicos posteriores (textos, colores, presets nuevos): Sonnet 5.5.

---

## 6. Pendientes / dudas abiertas

- Supuestos de la fase 2 que el manual no aclara: en SEQ los 16 pasos se muestran en las 16 teclas blancas; el SEQ graba paso a paso (cada nota avanza un paso, teclas juntas = acorde); el patrón dura hasta el último paso grabado; los botones de modo (FX, ENV, LFO, EDIT, GLO) prenden su LED mientras estás en ese modo; Rate de ARP/SEQ usa 1/4, 1/8, 1/8T, 1/16, 1/16T, 1/32.

- Ver un video del aparato encendido para afinar la tipografía y los colores exactos de la pantalla (el manual describe el contenido pero no los píxeles).
- Confirmar qué hace la tecla F#5 sin etiqueta (el manual no la menciona).
