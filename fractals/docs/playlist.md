# Playlist Curation

Multiple playlists organized by genre, each following chronological order within its category.

## Playlist Categories

| Category | Description | Era |
|----------|-------------|-----|
| Classical | Baroque through Impressionist masters | 1680-1890 |
| Bossa | Bossa nova & Brazilian jazz | 1958-1967 |
| Classics | Pop & rock anthems | 1975-1987 |
| Video | Video game & anime music | 1991-2001 |

## MIDI Sources

When adding new tracks, these sources provide quality MIDI files:

| Source | Quality | Notes |
|--------|---------|-------|
| [FreeMIDI.org](https://freemidi.org/) | Good | Large catalog, direct downloads |
| [MIDIShrine](https://www.midishrine.com/) | Good | Multiple versions per track |
| [VGMusic](https://www.vgmusic.com/) | Variable | Large video game catalog |
| [BitMidi](https://bitmidi.com/) | Variable | Easy interface |
| [MIDIWorld](https://www.midiworld.com/) | Good | Classical collection |
| [Kunst der Fuge](https://kunstderfuge.com/) | Excellent | Classical/Baroque specialist |

## Adding New Tracks

1. **Find MIDI**: Search sources above or request links in a table format:
   ```
   | Song | Artist | File Name | Download |
   |------|--------|-----------|----------|
   | Wave | Jobim  | jobim-wave.mid | [link](url) |
   ```

2. **Download**: Save to `~/Downloads/`

3. **Verify**: Check the file contains the expected song (see below)
   ```bash
   strings ~/Downloads/filename.mid | head -10
   ```

   > **Warning**: Some MIDI sites (especially FreeMIDI.org) serve mislabeled files.
   > The download filename often doesn't match the actual content.
   > Always verify before renaming!

4. **Test**: Play with the app to check soundfont compatibility
   - Prefer files >20kb (more instrumentation detail)
   - XG versions often have better instrument mappings
   - Avoid harsh synth patches; orchestral arrangements work well

5. **Move**: Copy to `public/midi/` with descriptive filename
   ```bash
   mv ~/Downloads/wave.mid public/midi/jobim-wave.mid
   ```

6. **Register**: Add entry to appropriate array in `src/main.ts`
   ```typescript
   { name: 'Wave (Jobim)', file: 'jobim-wave.mid' },
   ```

7. **Order**: Maintain chronological order within each playlist

## Verifying MIDI Contents

MIDI files often have embedded metadata (track names, song title, lyrics). Check before renaming:

```bash
# Quick check - shows song title, artist, lyrics
strings ~/Downloads/file.mid | head -20

# Example output for correct file:
# "THE GIRL FROM IPANEMA"
# "Antonio Carlos Jobim"

# Example output for WRONG file (mislabeled download):
# "MIDDLE OF THE ROAD"
# "The Pretenders"
# ← This means the site served the wrong file!
```

If the metadata doesn't match the expected song, the download is mislabeled. Try:
- A different MIDI source (MIDIWorld, BitMidi, etc.)
- Search for alternative arrangements
- Check if the site has multiple versions

## Current Playlists

### Classical (Baroque - Impressionist)
| Song | Composer | Year | Key |
|------|----------|------|-----|
| Canon in D | Pachelbel | ~1680 | D major |
| Toccata & Fugue | Bach | ~1708 | D minor |
| Fur Elise | Beethoven | 1810 | A minor |
| Moonlight Sonata | Beethoven | 1801 | C# minor |
| Rondo alla Turca | Mozart | 1783 | A major |
| Symphony No. 40 | Mozart | 1788 | G minor |
| Nocturne Op.9 No.2 | Chopin | 1832 | Eb major |
| Gymnopedie No.1 | Satie | 1888 | D major |
| Clair de Lune | Debussy | 1890 | Db major |

### Bossa Nova
| Song | Artist | Year |
|------|--------|------|
| Chega de Saudade | Jobim | 1958 |
| Desafinado | Jobim | 1959 |
| Corcovado | Jobim | 1960 |
| Meditation | Jobim | 1960 |
| One Note Samba | Jobim | 1961 |
| How Insensitive | Jobim | 1961 |
| Girl from Ipanema | Jobim | 1962 |
| Mas Que Nada | Jorge Ben | 1963 |
| So Nice / Summer Samba | Valle | 1965 |
| Wave | Jobim | 1967 |

### Classics (Pop/Rock)
| Song | Artist | Year |
|------|--------|------|
| Bohemian Rhapsody | Queen | 1975 |
| Dancing Queen | ABBA | 1976 |
| Stayin' Alive | Bee Gees | 1977 |
| Don't Stop Believin' | Journey | 1981 |
| Billie Jean | Michael Jackson | 1982 |
| Sweet Dreams | Eurythmics | 1983 |
| Take My Breath Away | Berlin | 1986 |
| Livin' on a Prayer | Bon Jovi | 1986 |
| Never Gonna Give You Up | Rick Astley | 1987 |
| La Bamba | Los Lobos | 1987 |
| Sweet Child O' Mine | Guns N' Roses | 1987 |

### Video Game / Anime
| Song | Game/Show | Year |
|------|-----------|------|
| Dark World | Zelda: ALTTP | 1991 |
| Terra's Theme | Final Fantasy VI | 1994 |
| Schala's Theme | Chrono Trigger | 1995 |
| Into the Wilderness | Wild Arms | 1996 |
| Fight On! | Final Fantasy VII | 1997 |
| Hero's Theme | Final Fantasy Tactics | 1997 |
| Tank! | Cowboy Bebop | 1998 |
| Drowning Valley | Chrono Cross | 1999 |
| Fisherman's Horizon | Final Fantasy VIII | 1999 |
| Battle Theme | Golden Sun | 2001 |
| To Zanarkand | Final Fantasy X | 2001 |
| Aerith's Theme | Final Fantasy VII | -- |

## MIDI Quality Guidelines

- Prefer files >20kb (more instrumentation detail)
- XG versions often have better instrument mappings
- Test with TimGM6mb.sf2 soundfont before adding
- Avoid harsh synth patches; orchestral arrangements work well

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
```

Common remaps for harsh synths:
- 81 (Sawtooth Lead) → 48 (Strings) or 80 (Square Lead)
- 62 (Synth Brass 1) → 63 (Synth Brass 2) or 61 (Brass Section)
