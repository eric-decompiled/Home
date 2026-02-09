# Playlist Curation

The song selection follows a chronological journey through video game music history (1991-2001), with a special closing track.

## Current Playlist

| # | Song | Game | Year | File |
|---|------|------|------|------|
| 1 | Dark World | Zelda: A Link to the Past | 1991 | zelda-alttp-dark-world.mid |
| 2 | Terra's Theme | Final Fantasy VI | 1994 | ff6-terras-theme.mid |
| 3 | Schala's Theme | Chrono Trigger | 1995 | schala.mid |
| 4 | Into the Wilderness | Wild Arms | 1996 | wa1-opening.mid |
| 5 | Fight On! | Final Fantasy VII | 1997 | ff7-boss.mid |
| 6 | Hero's Theme | Final Fantasy Tactics | 1997 | fft-heros-theme.mid |
| 7 | Tank! | Cowboy Bebop | 1998 | cowboy-bebop-tank.mid |
| 8 | Drowning Valley | Chrono Cross | 1999 | cc-drowning_valley.mid |
| 9 | Fisherman's Horizon | Final Fantasy VIII | 1999 | ff8-fishermans-horizon.mid |
| 10 | Battle Theme | Golden Sun | 2001 | golden-sun-battle.mid |
| 11 | To Zanarkand | Final Fantasy X | 2001 | to-zanarkand.mid |
| 12 | Aerith's Theme | Final Fantasy VII | ♡ | aeris-theme.mid |

## Selection Criteria

### Chronological Flow
Songs are ordered by release year to create a journey through gaming eras:
- **Early 90s (1991-1993)**: SNES golden age
- **Mid 90s (1994-1995)**: RPG renaissance
- **Late 90s (1996-1999)**: PS1/N64 era
- **Early 2000s (2001)**: PS2 generation

### MIDI Quality
- Prefer files >20kb (more instrumentation detail)
- XG versions often have better instrument mappings
- Test with TimGM6mb.sf2 soundfont before adding
- Avoid harsh synth patches; orchestral arrangements work well

### Gaps to Fill
- 1992-1993: No current entries (Sonic 2, Secret of Mana, Mega Man X are candidates)
- Post-2001: Could extend to modern era (Portal, Undertale)

## MIDI Sources

| Source | Quality | Notes |
|--------|---------|-------|
| [MIDIShrine](https://www.midishrine.com/) | Good | Multiple versions per track |
| [VGMusic](https://www.vgmusic.com/) | Variable | Large catalog, check file size |
| [BitMidi](https://bitmidi.com/) | Variable | Easy downloads |

## Adding New Tracks

1. Download MIDI to `~/Downloads/`
2. Test playback quality with soundfont
3. Move to `public/midi/` with descriptive filename
4. Add entry to `songs` array in `src/main.ts`
5. Maintain chronological order (except special closers)

## Instrument Remapping

If a MIDI sounds wrong with the soundfont, you can remap programs:

```javascript
// Inspect programs
node -e "
const fs = require('fs');
const data = fs.readFileSync('public/midi/track.mid');
for (let i = 0; i < data.length - 1; i++) {
  if (data[i] >= 0xC0 && data[i] <= 0xCF) {
    console.log('Ch', data[i] & 0x0F, '-> Program', data[i + 1]);
  }
}
"

// Remap (modify buf[i + 1] values and write back)
```

Common remaps for harsh synths:
- 81 (Sawtooth Lead) → 48 (Strings) or 80 (Square Lead)
- 62 (Synth Brass 1) → 63 (Synth Brass 2) or 61 (Brass Section)
