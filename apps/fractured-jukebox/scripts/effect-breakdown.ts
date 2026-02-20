#!/usr/bin/env npx tsx
/**
 * Effect Time Breakdown
 * Injects timing into each effect to measure exact time spent per effect
 */

import puppeteer from 'puppeteer';
import { spawn, ChildProcess } from 'child_process';

const DURATION = 8000; // 8 seconds of profiling
const WARMUP = 3000;

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

function createBarChart(data: { name: string; avg: number; max: number; calls: number }[]): string {
  if (data.length === 0) return 'No data collected';

  const total = data.reduce((a, b) => a + b.avg, 0);
  const maxAvg = Math.max(...data.map(d => d.avg));
  const barWidth = 35;

  let chart = '\n' + '='.repeat(75) + '\n';
  chart += 'EFFECT TIME BREAKDOWN (per frame averages)\n';
  chart += '='.repeat(75) + '\n\n';

  // Sort by average time descending
  data.sort((a, b) => b.avg - a.avg);

  for (const item of data) {
    const barLen = Math.round((item.avg / maxAvg) * barWidth);
    const bar = '█'.repeat(barLen) + '░'.repeat(barWidth - barLen);
    const pct = total > 0 ? ((item.avg / total) * 100).toFixed(1) : '0';
    const name = item.name.slice(0, 18).padEnd(18);
    chart += `${name} ${bar} ${item.avg.toFixed(2)}ms (${pct}%) max:${item.max.toFixed(1)}ms\n`;
  }

  chart += `\n${'─'.repeat(75)}\n`;
  chart += `Total per frame: ${total.toFixed(2)}ms (${total > 16.67 ? 'OVER' : 'under'} 16.67ms budget)\n`;
  chart += `Target: 60 FPS = 16.67ms per frame\n`;
  chart += '='.repeat(75) + '\n';

  return chart;
}

async function main() {
  const preset = process.argv[2] || 'spiral';
  let server: ChildProcess | null = null;
  let browser: puppeteer.Browser | null = null;

  console.log(`Profiling effects for preset: ${preset}`);

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

    // Select preset
    if (preset !== 'spiral') {
      const btn = await page.$(`#preset-${preset}`);
      if (btn) await btn.click();
      await new Promise(r => setTimeout(r, 500));
    }

    // Inject effect timing instrumentation - hook into compositor.render
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

        var originalRender = compositor.render.bind(compositor);
        compositor.render = function(canvas) {
          var start = performance.now();
          var result = originalRender(canvas);
          var elapsed = performance.now() - start;

          window.__renderTimes.push(elapsed);
          window.__frameCount++;

          if (window.__renderTimes.length > 600) {
            window.__renderTimes.shift();
          }

          return result;
        };

        var originalUpdate = compositor.update.bind(compositor);
        compositor.update = function(dt, musicParams) {
          var start = performance.now();
          var result = originalUpdate(dt, musicParams);
          var elapsed = performance.now() - start;

          window.__updateTimes.push(elapsed);

          if (window.__updateTimes.length > 600) {
            window.__updateTimes.shift();
          }

          return result;
        };

        console.log('Compositor hooked for profiling');
      }

      hookCompositor();
    `);

    // Click play overlay
    const overlay = await page.$('.play-overlay');
    if (overlay) await overlay.click();

    console.log(`Warming up for ${WARMUP / 1000}s...`);
    await new Promise(r => setTimeout(r, WARMUP));

    // Reset counters and enable per-effect profiling
    await page.evaluate(`
      window.__renderTimes = [];
      window.__updateTimes = [];
      window.__frameCount = 0;
      if (window.compositor) {
        window.compositor.profileEnabled = true;
        window.compositor.clearProfileStats();
      }
    `);

    console.log(`Collecting effect times for ${DURATION / 1000}s...`);
    await new Promise(r => setTimeout(r, DURATION));

    // Get the results from our compositor hooks
    const results = await page.evaluate(`
      var effectStats = [];
      if (window.compositor && window.compositor.getProfileStats) {
        effectStats = window.compositor.getProfileStats();
      }
      ({
        renderTimes: window.__renderTimes || [],
        updateTimes: window.__updateTimes || [],
        frameCount: window.__frameCount || 0,
        effectStats: effectStats
      })
    `) as {
      renderTimes: number[];
      updateTimes: number[];
      frameCount: number;
      effectStats: { id: string; avg: number; max: number; samples: number }[];
    };

    const renderTimes = results.renderTimes as number[];
    const updateTimes = results.updateTimes as number[];

    if (renderTimes.length === 0) {
      console.log('\nNo render timing data collected. Compositor may not have been hooked.');
      return;
    }

    // Combine update + render as total frame work
    const totalTimes = renderTimes.map((r, i) => r + (updateTimes[i] || 0));

    const analyzeArray = (times: number[], name: string) => {
      if (times.length === 0) return;
      const sorted = [...times].sort((a, b) => a - b);
      const avg = times.reduce((a, b) => a + b, 0) / times.length;
      const p50 = sorted[Math.floor(sorted.length * 0.5)];
      const p95 = sorted[Math.floor(sorted.length * 0.95)];
      const p99 = sorted[Math.floor(sorted.length * 0.99)];
      const max = sorted[sorted.length - 1];
      const min = sorted[0];

      console.log(`\n--- ${name} ---`);
      console.log(`  Samples:  ${times.length}`);
      console.log(`  Min:      ${min.toFixed(2)}ms`);
      console.log(`  Average:  ${avg.toFixed(2)}ms`);
      console.log(`  Median:   ${p50.toFixed(2)}ms`);
      console.log(`  P95:      ${p95.toFixed(2)}ms`);
      console.log(`  P99:      ${p99.toFixed(2)}ms`);
      console.log(`  Max:      ${max.toFixed(2)}ms`);
      return avg;
    };

    console.log('='.repeat(65));
    console.log(`COMPOSITOR TIMING - ${preset.toUpperCase()} PRESET`);
    console.log('='.repeat(65));

    const avgUpdate = analyzeArray(updateTimes, 'Update Phase (effect.update calls)');
    const avgRender = analyzeArray(renderTimes, 'Render Phase (canvas compositing)');
    const avgTotal = analyzeArray(totalTimes, 'Total Frame Work');

    // Show update vs render split
    if (avgUpdate !== undefined && avgRender !== undefined) {
      const total = avgUpdate + avgRender;
      console.log(`\n--- Time Budget Split ---`);
      const updatePct = (avgUpdate / total * 100).toFixed(0);
      const renderPct = (avgRender / total * 100).toFixed(0);
      const updateBar = '█'.repeat(Math.round(avgUpdate / total * 40));
      const renderBar = '█'.repeat(Math.round(avgRender / total * 40));
      console.log(`  Update: ${updateBar.padEnd(40)} ${avgUpdate.toFixed(2)}ms (${updatePct}%)`);
      console.log(`  Render: ${renderBar.padEnd(40)} ${avgRender.toFixed(2)}ms (${renderPct}%)`);
    }

    // Histogram of total times
    const buckets = [0, 4, 8, 12, 16, 20, 25, 33, 50, 100];
    console.log(`\n--- Total Frame Time Histogram ---`);

    for (let i = 0; i < buckets.length - 1; i++) {
      const count = totalTimes.filter((t: number) => t >= buckets[i] && t < buckets[i + 1]).length;
      const pct = (count / totalTimes.length * 100).toFixed(1);
      const barLen = Math.round(count / totalTimes.length * 40);
      const bar = '█'.repeat(barLen) + '░'.repeat(40 - barLen);
      const label = `${buckets[i]}-${buckets[i+1]}ms`.padEnd(10);
      const target = buckets[i + 1] <= 16 ? '✓' : '✗';
      console.log(`  ${label} ${bar} ${count} (${pct}%) ${target}`);
    }

    const targetMs = 16.67;
    const underBudget = totalTimes.filter((t: number) => t <= targetMs).length;
    console.log(`\n--- Summary ---`);
    console.log(`  Target: 16.67ms (60 FPS)`);
    console.log(`  Frames under budget: ${underBudget}/${totalTimes.length} (${(underBudget / totalTimes.length * 100).toFixed(0)}%)`);
    if (avgTotal !== undefined && avgTotal > targetMs) {
      console.log(`  Average overage: ${(avgTotal - targetMs).toFixed(2)}ms`);
      console.log(`  Need to save: ${((avgTotal - targetMs) / avgTotal * 100).toFixed(0)}% to hit 60 FPS`);
    } else {
      console.log(`  Status: UNDER BUDGET ✓`);
    }
    // Per-effect breakdown
    const effectStats = results.effectStats;
    if (effectStats && effectStats.length > 0) {
      console.log('\n' + '='.repeat(65));
      console.log('PER-EFFECT RENDER TIME BREAKDOWN');
      console.log('='.repeat(65) + '\n');

      const totalEffectTime = effectStats.reduce((a, e) => a + e.avg, 0);
      const maxEffectAvg = Math.max(...effectStats.map(e => e.avg));

      for (const effect of effectStats) {
        const barLen = Math.round((effect.avg / maxEffectAvg) * 35);
        const bar = '█'.repeat(barLen) + '░'.repeat(35 - barLen);
        const pct = totalEffectTime > 0 ? ((effect.avg / totalEffectTime) * 100).toFixed(0) : '0';
        const id = effect.id.slice(0, 18).padEnd(18);
        console.log(`${id} ${bar} ${effect.avg.toFixed(2)}ms (${pct}%) max:${effect.max.toFixed(1)}ms`);
      }

      console.log(`\n${'─'.repeat(65)}`);
      console.log(`Total effect render: ${totalEffectTime.toFixed(2)}ms`);
      console.log(`Compositing overhead: ${Math.max(0, (avgRender || 0) - totalEffectTime).toFixed(2)}ms`);
    }

    console.log('='.repeat(65) + '\n');

  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
}

main();
