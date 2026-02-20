# UI Patterns

## Play Overlay

The initial overlay shown before playback starts. Uses CSS grid for layout.

**Structure**:
- Row 1: Info cards (Views, Playlists) - `justify-self: start/end` for space-between effect
- Row 2: Center column with logo, About button, Play button (flex column, gap 12px)

**Responsive behavior** (700px breakpoint):
- Desktop: 2-column grid with info cards spread apart, center below
- Mobile: Same grid but info cards stretch to fill width

**About button styling**:
- Blue info color (`#4a9eff`), not green accent
- Match play button width with `min-width: 200px`
- Keep border-radius proportional to height (8px, not 16px) to avoid pill shape

## Modals

Modal pattern used for Save Preset, QR Code, About:
- Overlay: `position: fixed; inset: 0; z-index: 10001`
- Visibility toggle via `.visible` class (opacity + pointer-events)
- Close on: X button, backdrop click, Escape key
- Each modal registers its own Escape handler

**QR Code**: Use dynamic import to avoid Vite HMR issues:
```ts
const QrCreator = (await import('qr-creator')).default;
```

## Share URL

Base URL is hardcoded to production: `https://decompiled.dev/apps/fractured-jukebox/`

The `generateShareURL()` function builds URLs with current state, playlist, and track params.

## Layer Panel Footer

Footer contains About (info icon) and Share button group (Share + QR icon).
- About button: blue info color, icon-only
- Share button: text button with attached QR icon button
- QR button has subtle background (`var(--ui-bg-button)`) to differentiate from Share text
