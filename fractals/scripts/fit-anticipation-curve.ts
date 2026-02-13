/**
 * Curve fitting for anticipation lookahead based on empirical data
 */

// Empirical data points (BPM → desired visible window in ms)
const points = [
  { bpm: 60, windowMs: 570 },   // Slow ballads - long anticipation feels good
  { bpm: 82, windowMs: 366 },   // FF Prelude - tested, works well
  { bpm: 90, windowMs: 306 },   // To Zanarkand - tested, works well
  { bpm: 112, windowMs: 240 },  // Don't Stop Believing - needs longer window (many chords)
  { bpm: 128, windowMs: 200 },  // Sweet Child O' Mine - balanced for riff visibility
  { bpm: 160, windowMs: 100 },  // Fast rock - tight but visible
  { bpm: 200, windowMs: 80 },   // Minimum - ~5 frames at 60fps
];

// Convert to beats for fitting
const pointsInBeats = points.map(p => ({
  bpm: p.bpm,
  beats: p.windowMs / (60000 / p.bpm)
}));

console.log("Data points (window in beats):");
pointsInBeats.forEach(p => console.log(`  ${p.bpm} BPM: ${p.beats.toFixed(3)} beats`));

const n = pointsInBeats.length;
const bpms = pointsInBeats.map(p => p.bpm);
const beats = pointsInBeats.map(p => p.beats);
const logBpm = bpms.map(b => Math.log(b));
const logBeats = beats.map(b => Math.log(b));

// Helper for linear regression
function linReg(x: number[], y: number[]) {
  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

// 1. Power law: beats = a * bpm^b
const powerReg = linReg(logBpm, logBeats);
const a_power = Math.exp(powerReg.intercept);
const b_power = powerReg.slope;

console.log("\n1. POWER LAW: beats = a * bpm^b");
console.log(`   a = ${a_power.toFixed(4)}, b = ${b_power.toFixed(4)}`);
console.log(`   Formula: lookahead = ${a_power.toFixed(1)} * Math.pow(bpm, ${b_power.toFixed(2)})`);

// R² for power law
const yMean = logBeats.reduce((a, b) => a + b, 0) / n;
const ssTot = logBeats.reduce((sum, y) => sum + Math.pow(y - yMean, 2), 0);
const ssResPower = logBeats.reduce((sum, y, i) => {
  const pred = Math.log(a_power) + b_power * logBpm[i];
  return sum + Math.pow(y - pred, 2);
}, 0);
const r2_power = 1 - ssResPower / ssTot;
console.log(`   R² = ${r2_power.toFixed(4)}`);

// 2. Exponential decay: beats = a * e^(b*bpm)
const expReg = linReg(bpms, logBeats);
const a_exp = Math.exp(expReg.intercept);
const b_exp = expReg.slope;

console.log("\n2. EXPONENTIAL DECAY: beats = a * e^(b*bpm)");
console.log(`   a = ${a_exp.toFixed(4)}, b = ${b_exp.toFixed(6)}`);
console.log(`   Formula: lookahead = ${a_exp.toFixed(2)} * Math.exp(${b_exp.toFixed(5)} * bpm)`);

const ssResExp = logBeats.reduce((sum, y, i) => {
  const pred = Math.log(a_exp) + b_exp * bpms[i];
  return sum + Math.pow(y - pred, 2);
}, 0);
const r2_exp = 1 - ssResExp / ssTot;
console.log(`   R² = ${r2_exp.toFixed(4)}`);

// 3. Hyperbolic: beats = a/bpm + b
const invBpm = bpms.map(b => 1 / b);
const hypReg = linReg(invBpm, beats);
const a_hyp = hypReg.slope;
const b_hyp = hypReg.intercept;

console.log("\n3. HYPERBOLIC: beats = a/bpm + b");
console.log(`   a = ${a_hyp.toFixed(1)}, b = ${b_hyp.toFixed(4)}`);
console.log(`   Formula: lookahead = ${a_hyp.toFixed(1)} / bpm + ${b_hyp.toFixed(3)}`);

const beatsMean = beats.reduce((a, b) => a + b, 0) / n;
const ssTotBeats = beats.reduce((sum, y) => sum + Math.pow(y - beatsMean, 2), 0);
const ssResHyp = beats.reduce((sum, y, i) => {
  const pred = a_hyp / bpms[i] + b_hyp;
  return sum + Math.pow(y - pred, 2);
}, 0);
const r2_hyp = 1 - ssResHyp / ssTotBeats;
console.log(`   R² = ${r2_hyp.toFixed(4)}`);

// Compare predictions
console.log("\n=== COMPARISON AT DATA POINTS ===");
console.log("BPM  | Actual | Power  | Exp    | Hyper");
console.log("-".repeat(45));
for (const p of pointsInBeats) {
  const power = a_power * Math.pow(p.bpm, b_power);
  const exp = a_exp * Math.exp(b_exp * p.bpm);
  const hyp = a_hyp / p.bpm + b_hyp;
  console.log(`${String(p.bpm).padStart(3)}  | ${p.beats.toFixed(3)}  | ${power.toFixed(3)}  | ${exp.toFixed(3)}  | ${hyp.toFixed(3)}`);
}

// Test at intermediate BPMs
console.log("\n=== PREDICTIONS AT OTHER BPMs ===");
console.log("BPM  | Power (beats) | Window (ms)");
console.log("-".repeat(35));
for (const bpm of [70, 100, 110, 120, 140, 150, 180]) {
  const power = a_power * Math.pow(bpm, b_power);
  const windowMs = power * (60000 / bpm);
  console.log(`${String(bpm).padStart(3)}  | ${power.toFixed(3)}         | ${windowMs.toFixed(0)}`);
}

console.log("\n=== RECOMMENDED IMPLEMENTATION ===");
console.log(`
// Power law fit from empirical data (R² = ${r2_power.toFixed(4)})
// Tested on: FF Prelude, To Zanarkand, Sweet Child O' Mine
private static getAnticipationParams(bpm: number): { lookahead: number; lowerBound: number } {
  // Power law: lookahead = ${a_power.toFixed(1)} * bpm^${b_power.toFixed(2)}
  const lookahead = ${a_power.toFixed(1)} * Math.pow(bpm, ${b_power.toFixed(2)});
  const lowerBound = lookahead / 20;  // 5% of lookahead
  return { lookahead, lowerBound };
}

// With minimum visibility floor (80ms / beatDuration)
`);
