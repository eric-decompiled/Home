#!/usr/bin/env npx tsx
/**
 * Quick test of quality scaling performance
 */

import puppeteer from 'puppeteer';
import { spawn, ChildProcess } from 'child_process';

const WARMUP = 2000;
const DURATION = 5000;

async function startDevServer(): Promise<ChildProcess> {
  const server = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server start timeout')), 30000);
    server.stdout?.on('data', (data: Buffer) => {
      if (data.toString().includes('Local:')) {
        clearTimeout(timeout);
        resolve(server);
      }
    });
    server.on('error', reject);
  });
}

async function testQuality(page: puppeteer.Page, scale: number): Promise<number> {
  // Set quality
  await page.evaluate(`window.compositor.renderScale = ${scale}`);
  await page.evaluate(`window.resizeCanvas && resizeCanvas()`);

  // Reset counters
  await page.evaluate(`
    window.__renderTimes = [];
    if (window.compositor) {
      window.compositor.profileEnabled = true;
      window.compositor.clearProfileStats();
    }
  `);

  await new Promise(r => setTimeout(r, DURATION));

  // Get results
  const times = await page.evaluate(`window.__renderTimes || []`) as number[];
  if (times.length === 0) return 0;
  return times.reduce((a, b) => a + b, 0) / times.length;
}

async function main() {
  let server: ChildProcess | null = null;
  let browser: puppeteer.Browser | null = null;

  try {
    server = await startDevServer();
    await new Promise(r => setTimeout(r, 2000));

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 2560, height: 1600, deviceScaleFactor: 1 });
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    // Inject timing hooks
    await page.evaluate(`
      window.__renderTimes = [];
      function hookCompositor() {
        var compositor = window.compositor;
        if (!compositor) { setTimeout(hookCompositor, 100); return; }
        if (compositor.__hooked) return;
        compositor.__hooked = true;
        var orig = compositor.render.bind(compositor);
        compositor.render = function(c) {
          var s = performance.now();
          var r = orig(c);
          window.__renderTimes.push(performance.now() - s);
          if (window.__renderTimes.length > 300) window.__renderTimes.shift();
          return r;
        };
      }
      hookCompositor();
    `);

    // Click play
    const overlay = await page.$('.play-overlay');
    if (overlay) await overlay.click();

    console.log('Warming up...');
    await new Promise(r => setTimeout(r, WARMUP));

    console.log('\n┌────────────────────────────────────────┐');
    console.log('│    QUALITY SCALING PERFORMANCE TEST    │');
    console.log('├──────────┬─────────────┬───────────────┤');
    console.log('│ Quality  │ Render (ms) │ Est. FPS      │');
    console.log('├──────────┼─────────────┼───────────────┤');

    const scales = [
      { name: 'High', scale: 1.0 },
      { name: 'Medium', scale: 0.75 },
      { name: 'Low', scale: 0.5 },
    ];

    for (const { name, scale } of scales) {
      const avgMs = await testQuality(page, scale);
      const fps = avgMs > 0 ? (1000 / avgMs).toFixed(0) : '?';
      console.log(`│ ${name.padEnd(8)} │ ${avgMs.toFixed(1).padStart(11)} │ ${fps.padStart(13)} │`);
    }

    console.log('└──────────┴─────────────┴───────────────┘\n');

  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

main();
