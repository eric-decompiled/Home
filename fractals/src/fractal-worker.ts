const ctx = self as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage: (msg: unknown, transfer: Transferable[]) => void };

const BASE_RANGE = 4.8;
const LUT_SIZE = 2048;

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

      let x = fx,
        y = ry;
      let x2 = x * x,
        y2 = y * y;
      let iteration = 0;
      let prevX = 0,
        prevY = 0;

      const bailout = fType === 7 ? 100.0 : 4.0;
      while (x2 + y2 <= bailout && iteration < maxIter) {
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

      if (iteration === maxIter) {
        // Interior of the set - transparent so background layers show through
        data32[row * w + px] = 0x00000000;
      } else {
        // Smooth coloring: normalized escape time → palette LUT
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
