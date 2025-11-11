import { createCanvas } from 'canvas'
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Generate favicon with Lissajous curve
function generateFavicon() {
  const size = 64
  const canvas = createCanvas(size, size)
  const ctx = canvas.getContext('2d')

  // Dark background
  ctx.fillStyle = '#1a1a2e'
  ctx.fillRect(0, 0, size, size)

  // Draw a 3:2 Perfect Fifth Lissajous curve
  const centerX = size / 2
  const centerY = size / 2
  const amplitude = size * 0.4
  const freqX = 3
  const freqY = 2
  const phase = Math.PI / 2

  ctx.strokeStyle = '#16c79a'
  ctx.lineWidth = 2.5
  ctx.beginPath()

  for (let i = 0; i <= 100; i++) {
    const angle = (i / 100) * Math.PI * 2
    const x = centerX + amplitude * Math.sin(freqX * angle + phase)
    const y = centerY + amplitude * Math.sin(freqY * angle)

    if (i === 0) {
      ctx.moveTo(x, y)
    } else {
      ctx.lineTo(x, y)
    }
  }
  ctx.stroke()

  // Save to public directory
  const buffer = canvas.toBuffer('image/png')
  const outputPath = join(__dirname, '../public/favicon.png')
  writeFileSync(outputPath, buffer)

  console.log('✓ Favicon generated successfully at public/favicon.png')
}

generateFavicon()
