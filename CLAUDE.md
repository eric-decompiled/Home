## Claude Instructions

- Never perform git write operations (commit, push, merge, rebase, etc.)

# Decompiled Labs

A portfolio site for communication and organizational technology apps, built with Astro. Each sub-directory contains a standalone Vite project.

## Architecture

```
/Users/eric/dsp/
├── astro.config.mjs          # Astro config with sub-project serving integration
├── package.json              # Scripts: dev, build, build:projects, preview
├── build-projects.js         # Builds sub-projects, copies to public/apps/
├── src/
│   ├── layouts/
│   │   └── BaseLayout.astro  # Shared head, nav
│   ├── components/
│   │   ├── Header.astro      # Site navigation (Home | Apps) + theme toggle
│   │   └── ProjectCard.astro # Card with image preview
│   ├── pages/
│   │   ├── index.astro       # Homepage with 3 featured apps
│   │   └── apps.astro        # All apps listing
│   ├── data/
│   │   └── projects.ts       # Project metadata (slug, title, description, image, tier)
│   └── styles/
│       └── global.css        # Dark/light themes, project cards, responsive styles
├── public/
│   ├── favicon.png           # Site favicon
│   ├── images/projects/      # Project preview images
│   └── apps/                 # Built sub-projects (e.g., apps/fractured-jukebox/)
└── dist/                     # Final output for GitHub Pages
```

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Astro dev server (serves sub-projects from public/) |
| `npm run build` | Build sub-projects + Astro site for production |
| `npm run build:projects` | Only build sub-projects to public/ |
| `npm run preview` | Preview production build |

## Apps

| Directory | Slug | Description | Featured |
|-----------|------|-------------|----------|
| `fractals` | fractured-jukebox | MIDI-driven music visualizer with fractals | Yes |
| `lissajous` | lissajous | Lissajous curves and musical intervals | Yes |
| `resonator` | resonator | RLC resonator for audio synthesis | Yes |
| `sound-synth` | sound-synth | Interactive harmonics explorer | - |
| `karplus-strong` | karplus-strong | Karplus-Strong plucked string synth | - |
| `intervals` | intervals | Ear training with adaptive difficulty | - |

## Key Files

**astro.config.mjs**: Contains a custom integration that serves sub-project `index.html` files in dev mode at `/apps/{slug}/`.

**src/data/projects.ts**: Project metadata array. The `tier` field marks featured apps shown on homepage.

**build-projects.js**: Iterates sub-projects, runs `npm install` and `vite build`, copies output to `public/apps/{slug}/`. Supports source directory to output slug mapping (e.g., `fractals` → `fractured-jukebox`).

**src/styles/global.css**: Theme variables for dark/light modes. Sub-projects should use the same CSS variables for consistency.

## Theme System

Dark/light mode preference is stored in `localStorage` under `decompiled-theme` (values: `'light'` or `'dark'`). If no preference is stored, the system preference (`prefers-color-scheme`) is used.

**Main site**:
- `BaseLayout.astro`: Early inline script checks localStorage, falls back to system preference
- `Header.astro`: Toggle saves preference; "auto" button resets to system default
- Listens for OS preference changes when using system default

**Sub-apps**: Each app checks localStorage then system preference in `main.ts`:
```ts
const storedTheme = localStorage.getItem('decompiled-theme');
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
const isLight = storedTheme ? storedTheme === 'light' : !prefersDark;
if (isLight) {
  document.documentElement.classList.add('light-mode');
}
```

**CSS**: Use `.light-mode` selector (matches on `html` or `body`). All apps define the same sunset light theme variables.

**Transition prevention**: `theme-loading` class disables transitions during initial load to prevent flash.

## Adding an App

1. Create the project in its own directory with Vite
2. Add entry to `build-projects.js` projects array
3. Add entry to `src/data/projects.ts` with metadata
4. Add preview image to `public/images/projects/{slug}.png`
5. Run `npm run build:projects` to build it

## Deployment

The site deploys to GitHub Pages. Sub-project builds use `--base=/apps/{slug}/` for correct asset paths.
