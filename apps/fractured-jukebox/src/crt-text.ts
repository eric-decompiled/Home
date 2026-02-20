/**
 * CRT-style blocky text renderer using canvas
 * Renders text as chunky pixel blocks with optional glow and scanline effects
 */

// 5x7 pixel font definitions (each char is 5 wide, 7 tall)
// 1 = filled, 0 = empty
const FONT: Record<string, number[][]> = {
  F: [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,1,1,1,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
  ],
  R: [
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,0],
    [1,0,1,0,0],
    [1,0,0,1,0],
    [1,0,0,0,1],
  ],
  A: [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
  ],
  C: [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ],
  T: [
    [1,1,1,1,1],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
  ],
  U: [
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ],
  E: [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,1,1,1,0],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,1,1,1,1],
  ],
  H: [
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
  ],
  D: [
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,0],
  ],
  J: [
    [0,0,0,0,1],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ],
  K: [
    [1,0,0,0,1],
    [1,0,0,1,0],
    [1,0,1,0,0],
    [1,1,0,0,0],
    [1,0,1,0,0],
    [1,0,0,1,0],
    [1,0,0,0,1],
  ],
  B: [
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,1,1,1,0],
  ],
  O: [
    [0,1,1,1,0],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [1,0,0,0,1],
    [0,1,1,1,0],
  ],
  X: [
    [1,0,0,0,1],
    [0,1,0,1,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,0,1,0,0],
    [0,1,0,1,0],
    [1,0,0,0,1],
  ],
  ' ': [
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
    [0,0,0,0,0],
  ],
};

export interface CRTTextOptions {
  text: string;
  pixelSize?: number;        // Size of each "pixel" block
  color?: string;            // Main text color
  glowColor?: string;        // Glow color (null to disable)
  glowIntensity?: number;    // Glow blur radius
  scanlines?: boolean;       // Add horizontal scanlines
  scanlineOpacity?: number;  // Scanline darkness (0-1)
  letterSpacing?: number;    // Extra pixels between letters
  lineSpacing?: number;      // Extra pixels between lines (for multi-line)
}

/**
 * Create a canvas with CRT-style blocky text
 */
export function createCRTText(options: CRTTextOptions): HTMLCanvasElement {
  const {
    text,
    pixelSize = 4,
    color = '#16c79a',
    glowColor = 'rgba(22, 199, 154, 0.6)',
    glowIntensity = 12,
    scanlines = true,
    scanlineOpacity = 0.15,
    letterSpacing = 1,
    lineSpacing = 2,
  } = options;

  const lines = text.toUpperCase().split('\n');
  const charWidth = 5;
  const charHeight = 7;

  // Calculate canvas dimensions
  let maxLineWidth = 0;
  for (const line of lines) {
    const lineWidth = line.length * (charWidth + letterSpacing) - letterSpacing;
    maxLineWidth = Math.max(maxLineWidth, lineWidth);
  }

  const totalHeight = lines.length * (charHeight + lineSpacing) - lineSpacing;

  // Add padding for glow
  const padding = glowColor ? Math.ceil(glowIntensity * 2) : 0;

  const canvas = document.createElement('canvas');
  const width = (maxLineWidth * pixelSize) + (padding * 2);
  const height = (totalHeight * pixelSize) + (padding * 2);

  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d')!;

  // Helper to iterate over all letters with positions
  const forEachLetter = (callback: (glyph: number[][], x: number, y: number) => void) => {
    let yOffset = padding;
    for (const line of lines) {
      let xOffset = padding;
      const lineWidth = line.length * (charWidth + letterSpacing) - letterSpacing;
      xOffset += ((maxLineWidth - lineWidth) * pixelSize) / 2;

      for (const char of line) {
        const glyph = FONT[char];
        if (glyph) {
          callback(glyph, xOffset, yOffset);
        }
        xOffset += (charWidth + letterSpacing) * pixelSize;
      }
      yOffset += (charHeight + lineSpacing) * pixelSize;
    }
  };

  // Pass 1: Draw soft glow per letter
  if (glowColor && glowIntensity > 0) {
    ctx.shadowColor = glowColor;
    ctx.shadowBlur = glowIntensity;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = glowColor;

    forEachLetter((glyph, x, y) => {
      drawGlyph(ctx, glyph, x, y, pixelSize);
    });
  }

  // Pass 2: Draw solid letters on top (no shadow)
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;

  forEachLetter((glyph, x, y) => {
    drawGlyph(ctx, glyph, x, y, pixelSize);
  });

  // Pass 3: Add bright center highlight per pixel for phosphor hotspot
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';

  forEachLetter((glyph, xOffset, yOffset) => {
    for (let row = 0; row < glyph.length; row++) {
      for (let col = 0; col < glyph[row].length; col++) {
        if (glyph[row][col]) {
          const px = xOffset + col * pixelSize;
          const py = yOffset + row * pixelSize;
          // Small bright center
          const inset = Math.max(1, Math.floor(pixelSize * 0.25));
          ctx.fillRect(px + inset, py + inset, pixelSize - inset * 2, pixelSize - inset * 2);
        }
      }
    }
  });

  ctx.globalCompositeOperation = 'source-over';

  // Add scanlines by darkening existing pixels only
  if (scanlines) {
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = `rgba(0, 0, 0, ${scanlineOpacity})`;
    for (let y = 0; y < height; y += pixelSize * 2) {
      ctx.fillRect(0, y, width, pixelSize);
    }
    ctx.globalCompositeOperation = 'source-over';
  }

  return canvas;
}

function drawGlyph(
  ctx: CanvasRenderingContext2D,
  glyph: number[][],
  x: number,
  y: number,
  pixelSize: number
): void {
  for (let row = 0; row < glyph.length; row++) {
    for (let col = 0; col < glyph[row].length; col++) {
      if (glyph[row][col]) {
        const px = x + col * pixelSize;
        const py = y + row * pixelSize;
        ctx.fillRect(px, py, pixelSize, pixelSize);
      }
    }
  }
}

/**
 * Render CRT text directly to an existing canvas context
 */
export function renderCRTText(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  options: CRTTextOptions
): { width: number; height: number } {
  const canvas = createCRTText(options);
  ctx.drawImage(canvas, x - canvas.width / 2, y - canvas.height / 2);
  return { width: canvas.width, height: canvas.height };
}
