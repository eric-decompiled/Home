#!/usr/bin/env npx ts-node
/**
 * Performance Analysis Script
 *
 * Runs the visualizer in headless Chrome and collects performance metrics:
 * - Frame times (FPS distribution)
 * - Memory usage
 * - Long tasks
 * - JavaScript execution time
 *
 * Usage: npm run perf [-- duration_seconds] [-- preset]
 * Examples:
 *   npm run perf              # 30s with default preset
 *   npm run perf -- 15        # 15s with default preset
 *   npm run perf -- 30 clock  # 30s with clock preset
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { spawn, ChildProcess } from 'child_process';

const DEFAULT_DURATION = 30; // seconds
const WARMUP_TIME = 3000; // ms to wait before measuring
const SAMPLE_INTERVAL = 100; // ms between samples

interface FrameSample {
  timestamp: number;
  fps: number;
  renderMs: number;
  heapUsed: number;
}

interface PerfReport {
  duration: number;
  samples: FrameSample[];
  summary: {
    avgFps: number;
    minFps: number;
    maxFps: number;
    p95Fps: number;
    avgRenderMs: number;
    maxRenderMs: number;
    avgHeapMB: number;
    maxHeapMB: number;
    droppedFrames: number;
  };
  longTasks: number[];
}

async function startDevServer(): Promise<ChildProcess> {
  console.log('Starting Vite dev server...');
  const server = spawn('npm', ['run', 'dev'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: true,
  });

  // Wait for server to be ready
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Server start timeout')), 30000);

    server.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes('Local:') || output.includes('localhost')) {
        clearTimeout(timeout);
        console.log('Dev server ready');
        resolve(server);
      }
    });

    server.stderr?.on('data', (data: Buffer) => {
      console.error('Server error:', data.toString());
    });

    server.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function collectMetrics(page: Page, durationMs: number): Promise<PerfReport> {
  const samples: FrameSample[] = [];
  const longTasks: number[] = [];
  const startTime = Date.now();

  console.log(`Collecting metrics for ${durationMs / 1000}s...`);

  // Set up performance instrumentation
  await page.evaluate(() => {
    (window as any).__longTasks = [];
    (window as any).__frameTimes = [];
    (window as any).__lastFrameTime = performance.now();

    // Long task observer
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        (window as any).__longTasks.push(entry.duration);
      }
    });
    try {
      observer.observe({ entryTypes: ['longtask'] });
    } catch (e) {
      // longtask not supported in all browsers
    }

    // Frame time measurement using requestAnimationFrame
    function measureFrame() {
      const now = performance.now();
      const dt = now - (window as any).__lastFrameTime;
      (window as any).__lastFrameTime = now;
      if (dt > 0 && dt < 1000) { // ignore first frame and outliers
        (window as any).__frameTimes.push(dt);
        // Keep only last 1000 samples
        if ((window as any).__frameTimes.length > 1000) {
          (window as any).__frameTimes.shift();
        }
      }
      requestAnimationFrame(measureFrame);
    }
    requestAnimationFrame(measureFrame);
  });

  // Collect samples
  while (Date.now() - startTime < durationMs) {
    const sample = await page.evaluate(() => {
      const frameTimes = (window as any).__frameTimes || [];

      // Calculate FPS from recent frame times
      let fps = 0;
      let avgMs = 0;
      if (frameTimes.length > 10) {
        const recentTimes = frameTimes.slice(-60); // last ~1 second at 60fps
        avgMs = recentTimes.reduce((a: number, b: number) => a + b, 0) / recentTimes.length;
        fps = avgMs > 0 ? Math.round(1000 / avgMs) : 0;
      }

      const perf = (performance as any);
      const memory = perf.memory ? {
        heapUsed: perf.memory.usedJSHeapSize,
      } : { heapUsed: 0 };

      return {
        timestamp: Date.now(),
        fps,
        renderMs: avgMs,
        heapUsed: memory.heapUsed,
      };
    });

    if (sample.fps > 0) {
      samples.push(sample);
    }

    await new Promise(r => setTimeout(r, SAMPLE_INTERVAL));
  }

  // Collect long tasks
  const tasks = await page.evaluate(() => (window as any).__longTasks || []);
  longTasks.push(...tasks);

  // Calculate summary statistics
  const fpsList = samples.map(s => s.fps).filter(f => f > 0);
  const renderList = samples.map(s => s.renderMs).filter(r => r > 0);
  const heapList = samples.map(s => s.heapUsed).filter(h => h > 0);

  const sortedFps = [...fpsList].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedFps.length * 0.05); // 5th percentile (worst 5%)

  const summary = {
    avgFps: fpsList.length ? fpsList.reduce((a, b) => a + b, 0) / fpsList.length : 0,
    minFps: fpsList.length ? Math.min(...fpsList) : 0,
    maxFps: fpsList.length ? Math.max(...fpsList) : 0,
    p95Fps: sortedFps[p95Index] || 0,
    avgRenderMs: renderList.length ? renderList.reduce((a, b) => a + b, 0) / renderList.length : 0,
    maxRenderMs: renderList.length ? Math.max(...renderList) : 0,
    avgHeapMB: heapList.length ? heapList.reduce((a, b) => a + b, 0) / heapList.length / 1024 / 1024 : 0,
    maxHeapMB: heapList.length ? Math.max(...heapList) / 1024 / 1024 : 0,
    droppedFrames: fpsList.filter(f => f < 30).length,
  };

  return {
    duration: durationMs / 1000,
    samples,
    summary,
    longTasks,
  };
}

function printReport(report: PerfReport): void {
  console.log('\n' + '='.repeat(60));
  console.log('PERFORMANCE REPORT');
  console.log('='.repeat(60));

  console.log(`\nDuration: ${report.duration}s`);
  console.log(`Samples: ${report.samples.length}`);

  console.log('\n--- Frame Rate ---');
  console.log(`  Average FPS: ${report.summary.avgFps.toFixed(1)}`);
  console.log(`  Min FPS:     ${report.summary.minFps}`);
  console.log(`  Max FPS:     ${report.summary.maxFps}`);
  console.log(`  P95 FPS:     ${report.summary.p95Fps} (worst 5%)`);
  console.log(`  Dropped (<30fps): ${report.summary.droppedFrames} samples`);

  console.log('\n--- Render Time ---');
  console.log(`  Average: ${report.summary.avgRenderMs.toFixed(1)}ms`);
  console.log(`  Max:     ${report.summary.maxRenderMs}ms`);

  console.log('\n--- Memory ---');
  console.log(`  Average Heap: ${report.summary.avgHeapMB.toFixed(1)} MB`);
  console.log(`  Max Heap:     ${report.summary.maxHeapMB.toFixed(1)} MB`);

  console.log('\n--- Long Tasks (>50ms) ---');
  if (report.longTasks.length === 0) {
    console.log('  None detected');
  } else {
    console.log(`  Count: ${report.longTasks.length}`);
    console.log(`  Max duration: ${Math.max(...report.longTasks).toFixed(1)}ms`);
  }

  console.log('\n' + '='.repeat(60));

  // Grade the performance
  const grade = report.summary.avgFps >= 55 ? 'EXCELLENT' :
                report.summary.avgFps >= 45 ? 'GOOD' :
                report.summary.avgFps >= 30 ? 'ACCEPTABLE' : 'NEEDS IMPROVEMENT';
  console.log(`Overall: ${grade}`);
  console.log('='.repeat(60) + '\n');
}

async function main() {
  const duration = parseInt(process.argv[2]) || DEFAULT_DURATION;
  const preset = process.argv[3] || 'spiral'; // spiral, clock, warp, fractal, chain, piano
  let server: ChildProcess | null = null;
  let browser: Browser | null = null;

  console.log(`Configuration: ${duration}s, preset: ${preset}`);

  try {
    // Start dev server
    server = await startDevServer();

    // Wait a bit for server to fully initialize
    await new Promise(r => setTimeout(r, 2000));

    // Launch browser
    console.log('Launching headless browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--use-gl=swiftshader', // Software rendering for consistent results
        '--enable-webgl',
      ],
    });

    const page = await browser.newPage();

    // Set viewport to MacBook Air size (2560x1600 retina, but at 2x = 1280x800 CSS pixels)
    // Use actual resolution for performance testing
    await page.setViewport({ width: 2560, height: 1600, deviceScaleFactor: 1 });

    // Enable performance metrics
    await page.setCacheEnabled(false);

    // Navigate to app
    console.log('Loading application...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle0' });

    // Wait for app to initialize
    await page.waitForSelector('#fps-display', { timeout: 10000 });

    // Select preset if specified
    if (preset !== 'spiral') {
      console.log(`Selecting preset: ${preset}...`);
      const presetBtn = await page.$(`#preset-${preset}`);
      if (presetBtn) {
        await presetBtn.click();
        await new Promise(r => setTimeout(r, 500)); // wait for preset to apply
      } else {
        console.log(`Warning: Preset button for '${preset}' not found`);
      }
    }

    // Click the play overlay to start visualization
    console.log('Starting playback...');
    const playOverlay = await page.$('.play-overlay');
    if (playOverlay) {
      await playOverlay.click();
    } else {
      // Fallback to play button
      const playBtn = await page.$('.play-btn');
      if (playBtn) {
        await playBtn.click();
      }
    }

    // Wait for warmup
    console.log(`Warming up for ${WARMUP_TIME / 1000}s...`);
    await new Promise(r => setTimeout(r, WARMUP_TIME));

    // Collect metrics
    const report = await collectMetrics(page, duration * 1000);

    // Print report
    printReport(report);

    // Save detailed report to file
    const reportPath = `perf-report-${Date.now()}.json`;
    const fs = await import('fs');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`Detailed report saved to: ${reportPath}`);

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
    if (server) {
      server.kill();
    }
  }
}

main();
