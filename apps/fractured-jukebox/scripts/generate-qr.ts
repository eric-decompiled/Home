/**
 * Generate static QR code for the app URL at build time.
 * Uses puppeteer to run qr-creator in a browser context.
 *
 * Run with: npx ts-node --esm scripts/generate-qr.ts
 */

import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APP_URL = 'https://decompiled.dev/apps/fractured-jukebox/';
const OUTPUT_PATH = join(__dirname, '../public/qr-code.png');
const SIZE = 200;

async function generateQR() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Load qr-creator from CDN and generate QR code
  await page.setContent(`
    <!DOCTYPE html>
    <html>
    <head>
      <script src="https://cdn.jsdelivr.net/npm/qr-creator@1.0.0/dist/qr-creator.min.js"></script>
    </head>
    <body>
      <canvas id="qr" width="${SIZE}" height="${SIZE}"></canvas>
    </body>
    </html>
  `);

  // Generate QR code
  const dataUrl = await page.evaluate((url: string, size: number) => {
    const canvas = document.getElementById('qr') as HTMLCanvasElement;
    // @ts-expect-error QrCreator is loaded via script tag
    QrCreator.render({
      text: url,
      radius: 0.3,
      ecLevel: 'M',
      fill: '#000000',
      background: '#ffffff',
      size: size,
    }, canvas);
    return canvas.toDataURL('image/png');
  }, APP_URL, SIZE);

  await browser.close();

  // Convert data URL to buffer and save
  const base64Data = dataUrl.replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');
  writeFileSync(OUTPUT_PATH, buffer);

  console.log(`QR code generated: ${OUTPUT_PATH}`);
  console.log(`URL encoded: ${APP_URL}`);
}

generateQR().catch(console.error);
