#!/usr/bin/env npx ts-node
/**
 * Effect Profiler - Measures time spent in each effect
 * Creates a breakdown visualization of where render time goes
 */

import puppeteer from 'puppeteer';
import { spawn, ChildProcess } from 'child_process';

const DURATION = 10000; // 10 seconds of profiling

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

function createBarChart(data: { name: string; value: number; color: string }[], title: string): string {
  const maxValue = Math.max(...data.map(d => d.value));
  const barWidth = 40;

  let chart = `\n${title}\n${'='.repeat(60)}\n\n`;

  for (const item of data) {
    const barLen = Math.round((item.value / maxValue) * barWidth);
    const bar = '█'.repeat(barLen) + '░'.repeat(barWidth - barLen);
    const pct = ((item.value / data.reduce((a, b) => a + b.value, 0)) * 100).toFixed(1);
    chart += `${item.name.padEnd(20)} ${bar} ${item.value.toFixed(1)}ms (${pct}%)\n`;
  }

  return chart;
}

async function main() {
  const preset = process.argv[2] || 'clock';
  let server: ChildProcess | null = null;
  let browser: puppeteer.Browser | null = null;

  console.log(`Profiling preset: ${preset}`);

  try {
    server = await startDevServer();
    await new Promise(r => setTimeout(r, 2000));

    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-webgl'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 2560, height: 1600, deviceScaleFactor: 1 });

    // Inject profiling code
    await page.evaluateOnNewDocument(() => {
      (window as any).__effectTimes = {};
      (window as any).__frameCount = 0;

      // We'll hook into the compositor later
    });

    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    // Select preset
    if (preset !== 'spiral') {
      const btn = await page.$(`#preset-${preset}`);
      if (btn) await btn.click();
      await new Promise(r => setTimeout(r, 500));
    }

    // Inject timing hooks into compositor
    await page.evaluate(() => {
      const originalUpdate = (window as any).compositor?.update;
      const originalRender = (window as any).compositor?.render;

      // Since we can't easily hook the compositor, measure via Performance API
      (window as any).__effectTimes = {
        total: [],
        frames: 0,
      };

      // Hook requestAnimationFrame to measure total frame time
      const originalRAF = window.requestAnimationFrame;
      let lastTime = performance.now();

      window.requestAnimationFrame = function(callback: FrameRequestCallback) {
        return originalRAF.call(window, (time) => {
          const start = performance.now();
          callback(time);
          const elapsed = performance.now() - start;

          (window as any).__effectTimes.total.push(elapsed);
          (window as any).__effectTimes.frames++;

          // Keep only last 500 samples
          if ((window as any).__effectTimes.total.length > 500) {
            (window as any).__effectTimes.total.shift();
          }
        });
      };
    });

    // Start playback
    const overlay = await page.$('.play-overlay');
    if (overlay) await overlay.click();

    console.log(`Collecting data for ${DURATION / 1000}s...`);
    await new Promise(r => setTimeout(r, 3000)); // warmup

    // Reset counters after warmup
    await page.evaluate(() => {
      (window as any).__effectTimes.total = [];
      (window as any).__effectTimes.frames = 0;
    });

    await new Promise(r => setTimeout(r, DURATION));

    // Collect results
    const results = await page.evaluate(() => {
      const times = (window as any).__effectTimes.total;
      const frames = (window as any).__effectTimes.frames;

      if (times.length === 0) return null;

      const sorted = [...times].sort((a, b) => a - b);
      const avg = times.reduce((a: number, b: number) => a + b, 0) / times.length;
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      const max = sorted[sorted.length - 1];

      return { frames, avg, p50, p95, p99, max, samples: times.length };
    });

    if (!results) {
      console.log('No timing data collected');
      return;
    }

    // Also get a Chrome trace for detailed breakdown
    await page.tracing.start({ path: 'trace.json', categories: ['devtools.timeline'] });
    await new Promise(r => setTimeout(r, 3000));
    await page.tracing.stop();

    console.log('\n' + '='.repeat(60));
    console.log(`FRAME TIME ANALYSIS - ${preset.toUpperCase()} PRESET`);
    console.log('='.repeat(60));
    console.log(`\nSamples: ${results.samples} frames`);
    console.log(`\n--- Frame Time Distribution ---`);
    console.log(`  Average:  ${results.avg.toFixed(2)}ms (${(1000/results.avg).toFixed(0)} FPS)`);
    console.log(`  Median:   ${results.p50.toFixed(2)}ms`);
    console.log(`  P95:      ${results.p95.toFixed(2)}ms`);
    console.log(`  P99:      ${results.p99.toFixed(2)}ms`);
    console.log(`  Max:      ${results.max.toFixed(2)}ms`);

    // Budget breakdown (estimates based on typical composition)
    const budget = 16.67; // 60fps target
    const overhead = results.avg - budget;

    console.log(`\n--- Budget Analysis (16.67ms target) ---`);
    if (overhead > 0) {
      console.log(`  Over budget by: ${overhead.toFixed(2)}ms per frame`);
      console.log(`  Need to save: ${(overhead / results.avg * 100).toFixed(0)}% to hit 60fps`);
    } else {
      console.log(`  Under budget by: ${(-overhead).toFixed(2)}ms`);
    }

    // Histogram
    const buckets = [0, 8, 16, 24, 32, 48, 64, 100];
    console.log(`\n--- Frame Time Histogram ---`);

    const histogram: number[] = new Array(buckets.length).fill(0);
    const times = await page.evaluate(() => (window as any).__effectTimes.total);

    for (const t of times) {
      for (let i = buckets.length - 1; i >= 0; i--) {
        if (t >= buckets[i]) {
          histogram[i]++;
          break;
        }
      }
    }

    for (let i = 0; i < buckets.length - 1; i++) {
      const label = `${buckets[i]}-${buckets[i+1]}ms`.padEnd(12);
      const count = histogram[i];
      const pct = (count / times.length * 100).toFixed(1);
      const bar = '█'.repeat(Math.round(count / times.length * 40));
      console.log(`  ${label} ${bar} ${count} (${pct}%)`);
    }

    console.log(`\nChrome trace saved to: trace.json`);
    console.log(`Open in chrome://tracing for detailed breakdown`);
    console.log('='.repeat(60) + '\n');

  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

main();
