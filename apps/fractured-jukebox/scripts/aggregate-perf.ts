#!/usr/bin/env npx tsx
/**
 * Aggregate Performance Comparison
 * Runs all presets and outputs a clean comparison table
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { spawn, ChildProcess } from 'child_process';

const PRESETS = ['spiral', 'clock', 'warp', 'fractal', 'chain', 'piano'];
const TEST_DURATION = 10000; // 10s per preset
const WARMUP_TIME = 2000;

interface PresetResult {
  preset: string;
  avgFps: number;
  minFps: number;
  p95Fps: number;
  avgRenderMs: number;
  maxRenderMs: number;
}

async function startDevServer(): Promise<ChildProcess> {
  const server = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server start timeout')), 30000);
    server.stdout?.on('data', (data: Buffer) => {
      if (data.toString().includes('Local:') || data.toString().includes('localhost')) {
        clearTimeout(timeout);
        resolve(server);
      }
    });
    server.on('error', reject);
  });
}

async function testPreset(page: Page, preset: string): Promise<PresetResult> {
  // Reset frame times from any previous test
  await page.evaluate(`window.__frameTimes = []; window.__measuring = false;`);

  // Select preset
  const btn = await page.$(`#preset-${preset}`);
  if (btn) {
    await btn.click();
    await new Promise(r => setTimeout(r, 500));
  }

  // Warmup
  await new Promise(r => setTimeout(r, WARMUP_TIME));

  // Reset and start collecting frame times
  await page.evaluate(`
    window.__frameTimes = [];
    window.__lastFrameTime = performance.now();
    window.__measuring = true;
    if (!window.__measureLoop) {
      window.__measureLoop = true;
      (function measure() {
        if (window.__measuring) {
          const now = performance.now();
          const dt = now - window.__lastFrameTime;
          window.__lastFrameTime = now;
          if (dt > 0 && dt < 500) {
            window.__frameTimes.push(dt);
          }
        }
        requestAnimationFrame(measure);
      })();
    }
  `);

  await new Promise(r => setTimeout(r, TEST_DURATION));

  // Stop measuring
  await page.evaluate(`window.__measuring = false;`);

  const frameTimes: number[] = await page.evaluate(`window.__frameTimes || []`) as number[];
  
  if (frameTimes.length === 0) {
    return { preset, avgFps: 0, minFps: 0, p95Fps: 0, avgRenderMs: 0, maxRenderMs: 0 };
  }

  const fpsList = frameTimes.map(dt => 1000 / dt);
  const sorted = [...fpsList].sort((a, b) => a - b);
  const p5Index = Math.floor(sorted.length * 0.05);

  return {
    preset,
    avgFps: Math.round(fpsList.reduce((a, b) => a + b, 0) / fpsList.length),
    minFps: Math.round(Math.min(...fpsList)),
    p95Fps: Math.round(sorted[p5Index]),
    avgRenderMs: Math.round(frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length * 10) / 10,
    maxRenderMs: Math.round(Math.max(...frameTimes)),
  };
}

async function main() {
  let server: ChildProcess | null = null;
  let browser: Browser | null = null;

  try {
    console.log('Starting dev server...');
    server = await startDevServer();
    await new Promise(r => setTimeout(r, 2000));

    console.log('Launching browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    // Use 1920x1080 for more realistic testing
    await page.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });
    await page.waitForSelector('#fps-display', { timeout: 10000 });

    // Start playback
    const playOverlay = await page.$('.play-overlay');
    if (playOverlay) await playOverlay.click();

    const results: PresetResult[] = [];

    for (const preset of PRESETS) {
      process.stdout.write(`Testing ${preset}...`);
      const result = await testPreset(page, preset);
      results.push(result);
      console.log(` ${result.avgFps} FPS`);
    }

    // Print table
    console.log('\n' + '═'.repeat(70));
    console.log('  AGGREGATE PERFORMANCE COMPARISON (1920×1080)');
    console.log('═'.repeat(70));
    console.log('┌──────────┬─────────┬─────────┬─────────┬──────────┬──────────┐');
    console.log('│ Preset   │ Avg FPS │ Min FPS │ P95 FPS │ Avg (ms) │ Max (ms) │');
    console.log('├──────────┼─────────┼─────────┼─────────┼──────────┼──────────┤');
    
    for (const r of results) {
      const name = r.preset.padEnd(8);
      const avg = r.avgFps.toString().padStart(4);
      const min = r.minFps.toString().padStart(4);
      const p95 = r.p95Fps.toString().padStart(4);
      const avgMs = r.avgRenderMs.toFixed(1).padStart(5);
      const maxMs = r.maxRenderMs.toString().padStart(5);
      console.log(`│ ${name} │  ${avg}   │  ${min}   │  ${p95}   │  ${avgMs}   │  ${maxMs}   │`);
    }
    
    console.log('└──────────┴─────────┴─────────┴─────────┴──────────┴──────────┘');
    console.log('');
    console.log('Note: P95 FPS = worst 5% of frames (lower = more stutter)');
    console.log('');

  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

main();
