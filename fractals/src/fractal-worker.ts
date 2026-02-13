const ctx = self as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage: (msg: unknown, transfer: Transferable[]) => void };

const BASE_RANGE = 5.8;
const LUT_SIZE = 2048;

// Newton roots (cube roots of unity for n=3)
const NEWTON_ROOTS_3 = [
  [1, 0],                                    // Root 0: 1
  [-0.5, Math.sqrt(3) / 2],                  // Root 1: e^(2πi/3)
  [-0.5, -Math.sqrt(3) / 2],                 // Root 2: e^(4πi/3)
];

// Root colors for Newton coloring (evenly spaced hues)
const ROOT_COLORS = [
  [255, 80, 80],   // Root 0: Red
  [80, 255, 80],   // Root 1: Green
  [80, 80, 255],   // Root 2: Blue
];

ctx.onmessage = (e: MessageEvent) => {
  const t0 = performance.now();
  const msg = e.data;
  const w: number = msg.width;
  const fullH: number = msg.height;
  const yStart: number = msg.yStart;
  const bandH: number = msg.bandHeight;
  const bandIdx: number = msg.bandIndex;
  const frameId: number = msg.frameId;

  const buffer = new ArrayBuffer(w * bandH * 4);
  const data32 = new Uint32Array(buffer);

  const jR: number = msg.cReal;
  const jI: number = msg.cImag;
  const zoomVal: number = msg.zoom;
  const cx: number = msg.centerX;
  const cy: number = msg.centerY;
  const rot: number = msg.rotation || 0;
  const maxIter: number = msg.maxIterations;
  const fType: number = msg.fractalType;
  const pP: number = msg.phoenixP;
  const cLUT: Uint8Array = msg.colorLUT;

  const rangeW = BASE_RANGE / zoomVal;
  const rangeH = rangeW * (fullH / w);
  const xMin = cx - rangeW / 2;
  const yMin = cy - rangeH / 2;
  const stepX = rangeW / w;
  const stepY = rangeH / fullH;

  // Rotation around view center
  const cosA = Math.cos(rot);
  const sinA = Math.sin(rot);
  const rcx = cx;
  const rcy = cy;

  const invMaxIter = 1 / maxIter;
  const logD =
    fType === 1 ? Math.log(3) : fType === 2 ? Math.log(4) : Math.log(2);
  const lutMax = LUT_SIZE - 1;

  // Convergence-based fractals (Newton, Nova, Magnet I & II)
  const isConvergence = fType === 10 || fType === 11 || fType === 13 || fType === 19;

  for (let row = 0; row < bandH; row++) {
    const py = yStart + row;
    const fy = yMin + py * stepY;

    for (let px = 0; px < w; px++) {
      const ux = xMin + px * stepX;
      // Rotate around view center
      const dx = ux - rcx;
      const dy = fy - rcy;
      const fx = rcx + dx * cosA - dy * sinA;
      const ry = rcy + dx * sinA + dy * cosA;

      // Mandelbrot: z₀ = 0, c = pixel; Julia: z₀ = pixel, c = anchor
      const isMandelbrot = fType === 18;
      let x = isMandelbrot ? 0 : fx;
      let y = isMandelbrot ? 0 : ry;
      const cR = isMandelbrot ? fx : jR;
      const cI = isMandelbrot ? ry : jI;
      let x2 = x * x,
        y2 = y * y;
      let iteration = 0;
      let prevX = 0,
        prevY = 0;
      let rootIndex = -1; // For convergence fractals: which root converged to

      const bailout = fType === 7 || fType === 11 || fType === 13 ? 100.0 : 4.0;
      while (x2 + y2 <= bailout && iteration < maxIter) {

        // Convergence check for Newton (type 10) and Nova (type 11) - cube roots of unity
        // Nova uses tighter threshold for more detail (less washed out)
        if (fType === 10 || fType === 11) {
          const convergenceThreshold = fType === 11 ? 0.000001 : 0.0001;
          for (let k = 0; k < 3; k++) {
            const dr = x - NEWTON_ROOTS_3[k][0];
            const di = y - NEWTON_ROOTS_3[k][1];
            if (dr * dr + di * di < convergenceThreshold) {
              rootIndex = k;
              break;
            }
          }
          if (rootIndex >= 0) break;
        }

        // Convergence check for Magnet I & II (types 13, 19) - converges to z=1
        if (fType === 13 || fType === 19) {
          const d1 = (x - 1) * (x - 1) + y * y;
          if (d1 < 0.0001) {
            rootIndex = 0;
            break;
          }
        }
        let nx: number, ny: number;
        switch (fType) {
          case 1:
            nx = x * x2 - 3 * x * y2 + jR;
            ny = 3 * x2 * y - y * y2 + jI;
            break;
          case 2:
            nx = x2 * x2 - 6 * x2 * y2 + y2 * y2 + jR;
            ny = 4 * x * y * (x2 - y2) + jI;
            break;
          case 3: {
            const ax = Math.abs(x),
              ay = Math.abs(y);
            nx = ax * ax - ay * ay + jR;
            ny = 2 * ax * ay + jI;
            break;
          }
          case 4:
            nx = x2 - y2 + jR;
            ny = -2 * x * y + jI;
            break;
          case 5:
            nx = x2 - y2 + jR + pP * prevX;
            ny = 2 * x * y + jI + pP * prevY;
            prevX = x;
            prevY = y;
            break;
          case 6:
            nx = Math.abs(x2 - y2) + jR;
            ny = 2 * x * y + jI;
            break;
          case 8: {
            const ay = Math.abs(y);
            nx = x2 - ay * ay + jR;
            ny = 2 * x * ay + jI;
            break;
          }
          case 9: {
            const ax = Math.abs(x),
              ay = Math.abs(y);
            const zr = ax * ax - ay * ay,
              zi = 2 * ax * ay;
            nx = zr - ax + jR;
            ny = zi - ay + jI;
            break;
          }
          case 7: {
            const omx = 1 - x,
              omy = -y;
            const pr = x * omx - y * omy;
            const pi = x * omy + y * omx;
            nx = jR * pr - jI * pi;
            ny = jR * pi + jI * pr;
            break;
          }
          // --- NEW FAMILIES ---
          case 10: {
            // Newton-3: z = z - (z³-1)/(3z²)
            const r2 = x2 + y2;
            if (r2 < 1e-10) { nx = x; ny = y; break; }
            const r = Math.sqrt(r2);
            const theta = Math.atan2(y, x);
            // z³
            const r3 = r * r * r;
            const z3r = r3 * Math.cos(3 * theta);
            const z3i = r3 * Math.sin(3 * theta);
            // 3z²
            const r2sq = r2;
            const z2r = 3 * r2sq * Math.cos(2 * theta);
            const z2i = 3 * r2sq * Math.sin(2 * theta);
            // (z³ - 1) / 3z²
            const numR = z3r - 1, numI = z3i;
            const den = z2r * z2r + z2i * z2i;
            if (den < 1e-10) { nx = x; ny = y; break; }
            const divR = (numR * z2r + numI * z2i) / den;
            const divI = (numI * z2r - numR * z2i) / den;
            nx = x - divR;
            ny = y - divI;
            break;
          }
          case 11: {
            // Nova: z = z - (z³-1)/(3z²) + c
            const r2 = x2 + y2;
            if (r2 < 1e-10) { nx = jR; ny = jI; break; }
            const r = Math.sqrt(r2);
            const theta = Math.atan2(y, x);
            const r3 = r * r * r;
            const z3r = r3 * Math.cos(3 * theta);
            const z3i = r3 * Math.sin(3 * theta);
            const r2sq = r2;
            const z2r = 3 * r2sq * Math.cos(2 * theta);
            const z2i = 3 * r2sq * Math.sin(2 * theta);
            const numR = z3r - 1, numI = z3i;
            const den = z2r * z2r + z2i * z2i;
            if (den < 1e-10) { nx = x + jR; ny = y + jI; break; }
            const divR = (numR * z2r + numI * z2i) / den;
            const divI = (numI * z2r - numR * z2i) / den;
            nx = x - divR + jR;
            ny = y - divI + jI;
            break;
          }
          case 13: {
            // Magnet Type I: z = ((z² + c - 1) / (2z + c - 2))²
            const numR = x2 - y2 + jR - 1;
            const numI = 2 * x * y + jI;
            const denR = 2 * x + jR - 2;
            const denI = 2 * y + jI;
            const den2 = denR * denR + denI * denI;
            if (den2 < 1e-10) { nx = 1e10; ny = 1e10; break; }
            const divR = (numR * denR + numI * denI) / den2;
            const divI = (numI * denR - numR * denI) / den2;
            // Square the result
            nx = divR * divR - divI * divI;
            ny = 2 * divR * divI;
            break;
          }
          case 14: {
            // Barnsley Type 1: condition on Re(z)
            const dr = x >= 0 ? x - 1 : x + 1;
            nx = dr * jR - y * jI;
            ny = dr * jI + y * jR;
            break;
          }
          case 15: {
            // Barnsley Type 2: condition on Im(z*c)
            const prod = x * jI + y * jR;
            const dr = prod >= 0 ? x - 1 : x + 1;
            nx = dr * jR - y * jI;
            ny = dr * jI + y * jR;
            break;
          }
          case 16: {
            // Barnsley Type 3: quadratic with conditional
            const z2r = x2 - y2 - 1;
            const z2i = 2 * x * y;
            if (x > 0) {
              nx = z2r + jR;
              ny = z2i + jI;
            } else {
              nx = z2r + jR * x + jR;
              ny = z2i + jI * x + jI;
            }
            break;
          }
          case 17: {
            // Multicorn-3: z = conj(z)³ + c
            const r = Math.sqrt(x2 + y2);
            const theta = Math.atan2(-y, x); // -y for conjugate
            const r3 = r * r * r;
            nx = r3 * Math.cos(3 * theta) + jR;
            ny = r3 * Math.sin(3 * theta) + jI;
            break;
          }
          case 18:
            // Mandelbrot Classic: z² + c where c=pixel, z₀=slider
            nx = x2 - y2 + cR;
            ny = 2 * x * y + cI;
            break;
          case 19: {
            // Magnet Type II: z = ((z³ + 3(c-1)z + (c-1)(c-2)) / (3z² + 3(c-2)z + (c-1)(c-2) + 1))²
            // Let q = c - 1, r = c - 2
            const qR = jR - 1, qI = jI;
            const rR = jR - 2, rI = jI;
            // qr = (c-1)(c-2)
            const qrR = qR * rR - qI * rI;
            const qrI = qR * rI + qI * rR;
            // z³
            const z3R = x * x2 - 3 * x * y2;
            const z3I = 3 * x2 * y - y * y2;
            // 3qz = 3(c-1)z
            const tqzR = 3 * (qR * x - qI * y);
            const tqzI = 3 * (qR * y + qI * x);
            // Numerator: z³ + 3(c-1)z + (c-1)(c-2)
            const numR = z3R + tqzR + qrR;
            const numI = z3I + tqzI + qrI;
            // 3z²
            const tz2R = 3 * (x2 - y2);
            const tz2I = 3 * 2 * x * y;
            // 3rz = 3(c-2)z
            const trzR = 3 * (rR * x - rI * y);
            const trzI = 3 * (rR * y + rI * x);
            // Denominator: 3z² + 3(c-2)z + (c-1)(c-2) + 1
            const denR = tz2R + trzR + qrR + 1;
            const denI = tz2I + trzI + qrI;
            const den2 = denR * denR + denI * denI;
            if (den2 < 1e-10) { nx = 1e10; ny = 1e10; break; }
            const divR = (numR * denR + numI * denI) / den2;
            const divI = (numI * denR - numR * denI) / den2;
            // Square the result
            nx = divR * divR - divI * divI;
            ny = 2 * divR * divI;
            break;
          }
          default:
            nx = x2 - y2 + jR;
            ny = 2 * x * y + jI;
            break;
        }
        x = nx;
        y = ny;
        x2 = x * x;
        y2 = y * y;
        iteration++;
      }

      if (iteration === maxIter && rootIndex < 0) {
        // Interior of the set: transparent so background layers show through
        data32[row * w + px] = 0x00000000;
      } else if (isConvergence && rootIndex >= 0) {
        // Convergence coloring (Newton, Magnet): color by root, brightness by speed
        const baseColor = ROOT_COLORS[rootIndex % ROOT_COLORS.length];
        const brightness = 0.15 + 0.45 * (1 - iteration * invMaxIter);

        const oR = Math.min(255, Math.max(0, (baseColor[0] * brightness) | 0));
        const oG = Math.min(255, Math.max(0, (baseColor[1] * brightness) | 0));
        const oB = Math.min(255, Math.max(0, (baseColor[2] * brightness) | 0));

        const maxC = oR > oG ? (oR > oB ? oR : oB) : (oG > oB ? oG : oB);
        let oA = maxC < 15 ? 0 : (maxC - 15) * 4;
        if (oA > 255) oA = 255;

        data32[row * w + px] = (oA << 24) | (oB << 16) | (oG << 8) | oR;
      } else {
        // Escape coloring: normalized escape time → palette LUT
        const logMag = Math.log(x2 + y2);
        const smoothedRaw =
          logMag > 0
            ? iteration + 1 - Math.log(0.5 * logMag) / logD
            : iteration;
        const smoothed = smoothedRaw > 0 ? smoothedRaw : 0;

        const t = Math.sqrt(smoothed * invMaxIter);
        let li = (t * lutMax) | 0;
        if (li > lutMax) li = lutMax;

        const lutIdx = li * 3;
        const r = cLUT[lutIdx];
        const g = cLUT[lutIdx + 1];
        const b = cLUT[lutIdx + 2];

        const oR = r > 0 ? (r < 255 ? r | 0 : 255) : 0;
        const oG = g > 0 ? (g < 255 ? g | 0 : 255) : 0;
        const oB = b > 0 ? (b < 255 ? b | 0 : 255) : 0;

        // Alpha from pixel brightness
        const brightness = oR > oG ? (oR > oB ? oR : oB) : (oG > oB ? oG : oB);
        let oA = brightness < 15 ? 0 : (brightness - 15) * 4;
        if (oA > 255) oA = 255;

        data32[row * w + px] = (oA << 24) | (oB << 16) | (oG << 8) | oR;
      }
    }
  }

  const renderMs = performance.now() - t0;
  ctx.postMessage(
    { type: 'band', buffer, width: w, bandHeight: bandH, yStart, bandIndex: bandIdx, frameId, renderMs },
    [buffer]
  );
};
