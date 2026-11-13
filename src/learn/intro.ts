// Recorrido de bienvenida: una parte del FM-1 a la vez. Cada paso señala un
// control, dice qué hace en una frase y espera a que lo pruebes.

import type { FM1State } from '../fm1/store'
import type { Step } from './lesson'

export type { Step }

const filled = (s: FM1State) => s.seq.patterns[s.seq.pattern].filter((st) => st.length).length

export const INTRO: Step[] = [
  {
    title: 'This is the FM-1',
    body: 'A 6-operator FM synthesizer. I’ll show you each part, one at a time, and you try it.',
    target: null,
  },
  {
    title: 'The keys',
    body: 'The 27 keys play notes. You can also use the A S D F G H J K letters on your keyboard.',
    task: 'Play a key',
    target: 'key-7',
    check: (s) => s.pressedKeys.size > 0,
  },
  {
    title: 'MASTER',
    body: 'The main volume. Turn knobs by dragging up or down, or with the mouse wheel.',
    task: 'Turn MASTER',
    target: 'master',
    check: (s, a) => s.master !== a.master,
  },
  {
    title: 'The screen',
    body: 'Top: the current sound. Middle: what you’re editing. Bottom: the mode and page, or the value you’re changing.',
    target: 'screen',
  },
  {
    title: 'PRESETS',
    body: 'Browses the 128 stored sounds. Every click changes the sound instantly.',
    task: 'Pick another sound and play it',
    target: (s) => (s.presetIndex === 0 ? 'presets' : 'key-7'),
    check: (s, a) => s.presetIndex !== a.presetIndex && s.pressedKeys.size > 0,
  },
  {
    title: 'OCT− and OCT+',
    body: 'They shift the whole keyboard by an octave. The LED blinks slowly at ±1, fast at ±2 and stays lit at ±3.',
    task: 'Go up an octave',
    target: 'octUp',
    check: (s) => s.octave > 0,
  },
  {
    title: 'Back to 0',
    body: 'Pressing OCT− and OCT+ together resets octave and transpose to 0. With a mouse, press OCT− until the LED goes off.',
    task: 'Set the octave to 0',
    target: 'octDown',
    check: (s) => s.octave === 0,
  },
  {
    title: 'What is FM?',
    body: 'Each operator is a wave: it either sounds (carrier) or bends another one (modulator). ALGORITHM decides how the 6 are wired.',
    task: 'Turn ALGORITHM and watch the diagram',
    target: 'algorithm',
    check: (s, a) => s.patch.algorithm !== a.patch.algorithm,
  },
  {
    title: 'Effects',
    body: 'FX shows the chain of 6 effects. A bright box is on; a dim one is bypassed.',
    task: 'Press FX',
    target: 'fx',
    check: (s) => s.mode === 'fx',
  },
  {
    title: 'Pick an effect',
    body: 'SELECT moves the red dot between effects. Whatever is marked is what KNOB1–4 control.',
    task: 'Turn SELECT',
    target: (s) => (s.mode === 'fx' ? 'select' : 'fx'),
    check: (s, a) => s.mode === 'fx' && s.fxSelected !== a.fxSelected,
  },
  {
    title: 'KNOB1 to KNOB4',
    body: 'Their job changes with the mode. The bottom bar tells you what you’re moving and its value.',
    task: 'Turn KNOB2 and play a key',
    target: (s) => (s.mode !== 'fx' ? 'fx' : s.paramText ? 'key-7' : 'knob2'),
    check: (s) => s.mode === 'fx' && !!s.paramText && s.pressedKeys.size > 0,
  },
  {
    title: 'ENV',
    body: 'The envelope shapes each note: Attack (how it starts), Decay, Sustain and Release (how it fades).',
    task: 'Open ENV and raise Attack to 4 or more',
    target: (s) => (s.mode !== 'env' ? 'env' : 'knob1'),
    check: (s) => s.mode === 'env' && s.patch.env.a >= 4,
  },
  {
    title: 'LFO',
    body: 'An LFO is a slow wave that moves the sound. PMD wobbles the pitch; AMD, the volume.',
    task: 'Open LFO and raise PMD (KNOB3)',
    target: (s) => (s.mode !== 'lfo' ? 'lfo' : 'knob3'),
    check: (s) => s.mode === 'lfo' && s.patch.lfo.pmd >= 10,
  },
  {
    title: 'EDIT',
    body: 'This is where you edit each operator. In EDIT, the labeled black keys (OP1–OP6, PIT, GLO) choose what to edit.',
    task: 'Press EDIT, then the OP2 key',
    target: (s) => (s.mode !== 'edit' ? 'edit' : 'key-3'),
    check: (s) => s.mode === 'edit' && s.section === 1,
  },
  {
    title: 'Pages',
    body: 'Most modes have several pages. SELECT steps through them; the bottom bar shows which one you’re on.',
    task: 'Turn SELECT to page 3',
    target: (s) => (s.mode !== 'edit' ? 'edit' : 'select'),
    check: (s) => s.mode === 'edit' && s.page >= 2,
  },
  {
    title: 'HOME',
    body: 'Takes you back to the oscilloscope from any mode. There you see the wave you’re playing.',
    task: 'Press HOME',
    target: 'home',
    check: (s) => s.mode === 'home',
  },
  {
    title: 'ARP',
    body: 'The arpeggiator plays the notes you hold, one after another, on its own.',
    task: 'Press ARP and hold a key',
    target: (s) => (!s.arp.on ? 'arp' : 'key-7'),
    check: (s) => s.arp.on && s.held.length > 0,
  },
  {
    title: 'Turn ARP off',
    body: 'Press ARP again while you’re on its screen to turn it off.',
    task: 'Press ARP',
    target: 'arp',
    check: (s) => !s.arp.on,
  },
  {
    title: 'SEQ',
    body: 'The sequencer holds 16 steps. With REC on, each note you play fills the next step.',
    task: 'Press SEQ, then REC, and play 4 notes',
    target: (s) => (!s.seq.on ? 'seq' : !s.seq.recording ? 'rec' : ['key-7', 'key-11', 'key-14', 'key-19'][Math.min(3, filled(s))]),
    check: (s) => s.seq.on && filled(s) >= 4,
  },
  {
    title: 'Listen to it',
    body: 'Press REC again to stop recording: the pattern keeps playing. The steps show on the white keys.',
    task: 'Press REC',
    target: (s) => (s.seq.recording ? 'rec' : s.seq.on && !s.seq.playing ? 'play' : 'rec'),
    check: (s) => s.seq.on && s.seq.playing && !s.seq.recording,
  },
  {
    title: 'PLAY/STOP',
    body: 'Starts and stops the pattern. It only works with SEQ on.',
    task: 'Stop the pattern',
    target: 'play',
    check: (s) => !s.seq.playing,
  },
  {
    title: 'SAVE',
    body: 'Your changes are lost when you switch sounds. Hold SAVE to keep them.',
    task: 'Hold SAVE',
    target: 'save',
    check: (s) => s.saving,
  },
  {
    title: 'You know the FM-1!',
    body: 'You’ve seen every part. Go to Play to jam freely, or back to Learn to pick a song.',
    target: null,
  },
]
