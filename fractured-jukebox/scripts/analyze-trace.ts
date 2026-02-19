#!/usr/bin/env npx tsx
/**
 * Chrome Trace Analyzer
 * Parses trace.json and creates a visualization of where time is spent
 */

import { readFileSync } from 'fs';

interface TraceEvent {
  name: string;
  cat: string;
  ph: string; // phase: X = complete, B = begin, E = end
  ts: number; // timestamp in microseconds
  dur?: number; // duration in microseconds
  pid: number;
  tid: number;
  args?: {
    data?: {
      functionName?: string;
      url?: string;
      frame?: string;
    };
  };
}

interface TraceFile {
  traceEvents: TraceEvent[];
}

function formatMs(us: number): string {
  return (us / 1000).toFixed(2) + 'ms';
}

function createBarChart(data: { name: string; value: number }[], title: string, maxWidth = 40): string {
  if (data.length === 0) return '';

  const total = data.reduce((a, b) => a + b.value, 0);
  const maxValue = Math.max(...data.map(d => d.value));

  let chart = `\n${title}\n${'='.repeat(70)}\n\n`;

  for (const item of data) {
    const barLen = Math.round((item.value / maxValue) * maxWidth);
    const bar = '█'.repeat(barLen) + '░'.repeat(maxWidth - barLen);
    const pct = ((item.value / total) * 100).toFixed(1);
    const name = item.name.slice(0, 25).padEnd(25);
    chart += `${name} ${bar} ${formatMs(item.value)} (${pct}%)\n`;
  }

  chart += `\nTotal: ${formatMs(total)}\n`;
  return chart;
}

function main() {
  const tracePath = process.argv[2] || 'trace.json';

  console.log(`Analyzing trace: ${tracePath}\n`);

  const raw = readFileSync(tracePath, 'utf-8');
  const trace: TraceFile = JSON.parse(raw);

  // Group events by category and name
  const eventsByName: Map<string, number> = new Map();
  const eventsByCategory: Map<string, number> = new Map();
  const functionCalls: Map<string, number> = new Map();
  const scripts: Map<string, number> = new Map();

  // Find main thread
  const mainThreadId = trace.traceEvents.find(e =>
    e.cat === '__metadata' && e.name === 'thread_name' && e.args?.name === 'CrRendererMain'
  )?.tid;

  for (const event of trace.traceEvents) {
    // Only look at complete events with duration
    if (event.ph !== 'X' || !event.dur) continue;

    // Skip very short events (<10us)
    if (event.dur < 10) continue;

    // Aggregate by event name
    const existing = eventsByName.get(event.name) || 0;
    eventsByName.set(event.name, existing + event.dur);

    // Aggregate by category
    const catTotal = eventsByCategory.get(event.cat) || 0;
    eventsByCategory.set(event.cat, catTotal + event.dur);

    // Track function calls specifically
    if (event.name === 'FunctionCall' && event.args?.data?.functionName) {
      const fn = event.args.data.functionName;
      const fnTotal = functionCalls.get(fn) || 0;
      functionCalls.set(fn, fnTotal + event.dur);
    }

    // Track by script URL
    if (event.args?.data?.url) {
      const url = event.args.data.url;
      // Extract just the filename
      const filename = url.split('/').pop() || url;
      const scriptTotal = scripts.get(filename) || 0;
      scripts.set(filename, scriptTotal + event.dur);
    }
  }

  // Sort and take top items
  const sortedByName = [...eventsByName.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([name, value]) => ({ name, value }));

  const sortedByCategory = [...eventsByCategory.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  const sortedFunctions = [...functionCalls.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  const sortedScripts = [...scripts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value }));

  // Print charts
  console.log(createBarChart(sortedByCategory, 'TIME BY CATEGORY'));
  console.log(createBarChart(sortedByName, 'TIME BY EVENT TYPE'));
  console.log(createBarChart(sortedScripts, 'TIME BY SCRIPT'));
  console.log(createBarChart(sortedFunctions, 'TIME BY FUNCTION'));

  // Look for animation frame events
  const frameEvents = trace.traceEvents.filter(e =>
    e.name === 'RequestAnimationFrame' ||
    e.name === 'FireAnimationFrame' ||
    e.name === 'Animation'
  );

  if (frameEvents.length > 0) {
    console.log(`\nAnimation Frame Events: ${frameEvents.length}`);
  }

  // Look for long tasks
  const longTasks = trace.traceEvents.filter(e =>
    e.name === 'RunTask' && e.dur && e.dur > 50000 // > 50ms
  );

  if (longTasks.length > 0) {
    console.log(`\nLong Tasks (>50ms): ${longTasks.length}`);
    const longestTasks = longTasks
      .sort((a, b) => (b.dur || 0) - (a.dur || 0))
      .slice(0, 5);
    for (const task of longestTasks) {
      console.log(`  - ${formatMs(task.dur!)} at ${formatMs(task.ts)}`);
    }
  }
}

main();
