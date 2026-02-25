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

All modals use the shared `createModal()` factory from `src/modal.ts`.

### Usage

```ts
import { createModal } from './modal.ts';

// With auto-generated header (creates .modal-header with title + close button)
const myModal = createModal({
  overlayId: 'my-modal-overlay',
  title: 'Modal Title',
});

// With existing header elements
const aboutModal = createModal({
  overlayId: 'about-modal-overlay',
  closeButtonId: 'about-modal-close',
});

// By element reference (container-scoped modals)
const infoModal = createModal({
  overlay: container.querySelector('#fc-info-modal') as HTMLElement,
  closeButton: container.querySelector('.fc-info-close') as HTMLElement,
});

// API
myModal.open();
myModal.close();
myModal.isOpen();        // boolean
myModal.setTitle('New'); // update title (only if title option was provided)
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `overlayId` | string | - | Overlay element ID (uses `document.getElementById`) |
| `overlay` | HTMLElement | - | Overlay element directly (for container-scoped modals) |
| `closeButtonId` | string | - | Close button element ID |
| `closeButton` | HTMLElement | - | Close button element directly |
| `title` | string | - | If provided, creates a `.modal-header` with title and close button |
| `dismissOnBackdrop` | boolean | true | Close when clicking backdrop |
| `dismissOnEscape` | boolean | true | Close when pressing Escape key |
| `onOpen` | () => void | - | Callback when modal opens |
| `onClose` | () => void | - | Callback when modal closes |

### CSS Classes

The framework uses these shared CSS classes (defined in `style.css`):

- `.modal-header` - Header bar with darker background, flex layout
- `.modal-close` - Close button (×) with hover state

When `title` is provided, the header is automatically prepended to the modal content.

### CSS Pattern

- Overlay: `position: fixed; inset: 0; z-index: 10001`
- Visibility toggle via `.visible` class (opacity + pointer-events)
- Content scales from 0.95 to 1.0 on open
- Borders should use `var(--ui-border)` (not green accent color)

### Current Modals

| Modal | Location | ID/Selector |
|-------|----------|-------------|
| About | main.ts | `about-modal-overlay` |
| QR Code | main.ts | `qr-modal-overlay` |
| Layer Info | main.ts | `layer-info-modal` |
| Fractal Info | fractal-config.ts | `#fc-info-modal` |
| Fractal Controls | fractal-config.ts | `#fc-controls-modal` |
| Fractal Help | fractal-config.ts | `#fc-help-modal` |

### Notes

**QR Code**: Use dynamic import to avoid Vite HMR issues:
```ts
const QrCreator = (await import('qr-creator')).default;
```

**Content population**: For modals that need dynamic content (like Fractal Info), populate the content before calling `open()`:
```ts
private showFamilyInfo(): void {
  // Populate content first
  this.container.querySelector('#fc-info-title')!.textContent = family.label;
  // ... more content

  // Then open
  this.infoModal.open();
}
```

## Share URL

Base URL is hardcoded to production: `https://decompiled.dev/apps/fractured-jukebox/`

The `generateShareURL()` function builds URLs with current state, playlist, and track params.

## Layer Panel Footer

Footer contains About (info icon) and Share button group (Share + QR icon).
- About button: blue info color, icon-only
- Share button: text button with attached QR icon button
- QR button has subtle background (`var(--ui-bg-button)`) to differentiate from Share text
