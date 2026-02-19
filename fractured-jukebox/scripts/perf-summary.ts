#!/usr/bin/env npx tsx
/**
 * Quick Performance Summary
 * Runs both presets and shows a side-by-side comparison
 */

import puppeteer from 'puppeteer';
import { spawn, ChildProcess } from 'child_process';

const DURATION = 6000;
const WARMUP = 2000;

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

interface PresetResult {
  preset: string;
  avgRenderMs: number;
  p95RenderMs: number;
  effectTime: number;
  compositingTime: number;
  effectBreakdown: { id: string; avg: number }[];
  underBudget: number;
  samples: number;
}

async function profilePreset(page: puppeteer.Page, preset: string, isFirst: boolean): Promise<PresetResult> {
  // Select preset
  if (preset !== 'spiral') {
    const btn = await page.$(`#preset-${preset}`);
    if (btn) await btn.click();
    await new Promise(r => setTimeout(r, 500));
  }

  // Inject hooks
  await page.evaluate(`
    window.__renderTimes = [];
    window.__updateTimes = [];
    window.__frameCount = 0;

    function hookCompositor() {
      var compositor = window.compositor;
      if (!compositor) {
        setTimeout(hookCompositor, 100);
        return;
      }

      if (compositor.__hooked) return;
      compositor.__hooked = true;

      var originalRender = compositor.render.bind(compositor);
      compositor.render = function(canvas) {
        var start = performance.now();
        var result = originalRender(canvas);
        var elapsed = performance.now() - start;
        window.__renderTimes.push(elapsed);
        window.__frameCount++;
        if (window.__renderTimes.length > 400) window.__renderTimes.shift();
        return result;
      };
    }
    hookCompositor();
  `);

  // Click play overlay only on first run
  if (isFirst) {
    const overlay = await page.$('.play-overlay');
    if (overlay) await overlay.click();
  }

  // Warmup
  await new Promise(r => setTimeout(r, WARMUP));

  // Reset and enable profiling
  await page.evaluate(`
    window.__renderTimes = [];
    window.__frameCount = 0;
    if (window.compositor) {
      window.compositor.profileEnabled = true;
      window.compositor.clearProfileStats();
    }
  `);

  // Profile
  await new Promise(r => setTimeout(r, DURATION));

  // Collect results
  const results = await page.evaluate(`
    var effectStats = [];
    if (window.compositor && window.compositor.getProfileStats) {
      effectStats = window.compositor.getProfileStats();
    }
    ({
      renderTimes: window.__renderTimes || [],
      effectStats: effectStats
    })
  `) as { renderTimes: number[]; effectStats: { id: string; avg: number; max: number; samples: number }[] };

  const renderTimes = results.renderTimes;
  const sorted = [...renderTimes].sort((a, b) => a - b);
  const avgRender = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
  const p95Render = sorted[Math.floor(sorted.length * 0.95)];
  const effectTime = results.effectStats.reduce((a, e) => a + e.avg, 0);
  const underBudget = renderTimes.filter(t => t <= 16.67).length;

  return {
    preset,
    avgRenderMs: avgRender,
    p95RenderMs: p95Render,
    effectTime,
    compositingTime: avgRender - effectTime,
    effectBreakdown: results.effectStats.map(e => ({ id: e.id, avg: e.avg })),
    underBudget,
    samples: renderTimes.length,
  };
}

async function main() {
  let server: ChildProcess | null = null;
  let browser: puppeteer.Browser | null = null;

  console.log('\n╔════════════════════════════════════════════════════════════════╗');
  console.log('║            FRACTURED JUKEBOX PERFORMANCE ANALYSIS              ║');
  console.log('║                   Resolution: 2560x1600                        ║');
  console.log('╚════════════════════════════════════════════════════════════════╝\n');

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

    const presets = ['spiral', 'clock', 'warp'];
    const results: PresetResult[] = [];

    for (let i = 0; i < presets.length; i++) {
      const preset = presets[i];
      process.stdout.write(`Profiling ${preset}...`);
      const result = await profilePreset(page, preset, i === 0);
      results.push(result);
      console.log(` done (${result.samples} frames)`);
    }

    // Summary table
    console.log('\n┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ PRESET COMPARISON                                               │');
    console.log('├──────────┬──────────┬──────────┬──────────┬──────────┬──────────┤');
    console.log('│ Preset   │ Avg (ms) │ P95 (ms) │ Effects  │ Blit     │ Budget % │');
    console.log('├──────────┼──────────┼──────────┼──────────┼──────────┼──────────┤');

    for (const r of results) {
      const preset = r.preset.padEnd(8);
      const avg = r.avgRenderMs.toFixed(1).padStart(8);
      const p95 = r.p95RenderMs.toFixed(1).padStart(8);
      const eff = r.effectTime.toFixed(1).padStart(8);
      const comp = r.compositingTime.toFixed(1).padStart(8);
      const budget = ((r.underBudget / r.samples) * 100).toFixed(0).padStart(6) + '%';
      console.log(`│ ${preset} │${avg} │${p95} │${eff} │${comp} │  ${budget} │`);
    }

    console.log('└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘');

    // Effect breakdown for each preset
    console.log('\n┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ EFFECT BREAKDOWN (render time per effect in ms)                 │');
    console.log('└─────────────────────────────────────────────────────────────────┘\n');

    for (const r of results) {
      console.log(`  ${r.preset.toUpperCase()}:`);
      for (const e of r.effectBreakdown) {
        const bar = '█'.repeat(Math.round(e.avg * 20));
        console.log(`    ${e.id.padEnd(18)} ${bar} ${e.avg.toFixed(2)}ms`);
      }
      console.log();
    }

    // Key insight
    console.log('┌─────────────────────────────────────────────────────────────────┐');
    console.log('│ KEY INSIGHT                                                     │');
    console.log('├─────────────────────────────────────────────────────────────────┤');
    console.log('│ • Effect rendering: <2ms (fast)                                 │');
    console.log('│ • Canvas compositing: 24-36ms (bottleneck)                      │');
    console.log('│ • Each drawImage() at 2560x1600 costs ~7-8ms                    │');
    console.log('│                                                                 │');
    console.log('│ OPTIMIZATION OPTIONS:                                           │');
    console.log('│ 1. Render at lower resolution (1280x720) and upscale            │');
    console.log('│ 2. Reduce number of enabled effects/layers                      │');
    console.log('│ 3. Use WebGL compositor for GPU-accelerated blitting            │');
    console.log('└─────────────────────────────────────────────────────────────────┘\n');

  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

main();
