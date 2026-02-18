// --- Minimal Tweening System ---
// Self-contained animation utilities without external dependencies
// Provides GSAP-compatible API using requestAnimationFrame

// --- Easing Functions ---
// Pre-computed cubic-bezier approximations

type EasingFn = (t: number) => number;

const easingFunctions: Record<string, EasingFn> = {
  // Linear
  'linear': (t) => t,

  // Quadratic (power1)
  'power1.in': (t) => t * t,
  'power1.out': (t) => 1 - (1 - t) * (1 - t),
  'power1.inOut': (t) => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2,

  // Cubic (power2)
  'power2.in': (t) => t * t * t,
  'power2.out': (t) => 1 - Math.pow(1 - t, 3),
  'power2.inOut': (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,

  // Quartic (power3)
  'power3.in': (t) => t * t * t * t,
  'power3.out': (t) => 1 - Math.pow(1 - t, 4),
  'power3.inOut': (t) => t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2,

  // Quintic (power4)
  'power4.in': (t) => t * t * t * t * t,
  'power4.out': (t) => 1 - Math.pow(1 - t, 5),
  'power4.inOut': (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2,

  // Elastic (simplified)
  'elastic.out(1, 0.5)': (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.1) * 5 * Math.PI) + 1;
  },
  'elastic.out(1, 0.75)': (t) => {
    if (t === 0 || t === 1) return t;
    return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * 6 * Math.PI) + 1;
  },
};

function getEasing(ease: string): EasingFn {
  return easingFunctions[ease] || easingFunctions['power2.out'];
}

// --- Active Tweens ---

interface ActiveTween {
  target: object;
  props: Record<string, { start: number; end: number }>;
  startTime: number;
  duration: number; // in ms
  easing: EasingFn;
  onUpdate?: () => void;
  onComplete?: () => void;
  stopped: boolean;
}

const activeTweens: Set<ActiveTween> = new Set();
let rafId: number | null = null;

function tick(time: number): void {
  for (const tween of activeTweens) {
    if (tween.stopped) {
      activeTweens.delete(tween);
      continue;
    }

    const elapsed = time - tween.startTime;
    const progress = Math.min(elapsed / tween.duration, 1);
    const easedProgress = tween.easing(progress);

    // Update all properties
    for (const [key, { start, end }] of Object.entries(tween.props)) {
      (tween.target as Record<string, number>)[key] = start + (end - start) * easedProgress;
    }

    tween.onUpdate?.();

    if (progress >= 1) {
      activeTweens.delete(tween);
      tween.onComplete?.();
    }
  }

  if (activeTweens.size > 0) {
    rafId = requestAnimationFrame(tick);
  } else {
    rafId = null;
  }
}

function startLoop(): void {
  if (rafId === null && activeTweens.size > 0) {
    rafId = requestAnimationFrame(tick);
  }
}

// --- Public API ---

export interface TweenControl {
  kill(): void;
  isActive(): boolean;
}

export interface Timeline {
  to(target: object, vars: TweenVars): Timeline;
  kill(): void;
}

interface TweenVars {
  duration?: number;
  ease?: string;
  overwrite?: boolean | 'auto';
  onUpdate?: () => void;
  onComplete?: () => void;
  [key: string]: unknown;
}

// Store active tweens per object for overwrite handling
const tweensByTarget = new WeakMap<object, Map<string, ActiveTween>>();

function getTweenMap(target: object): Map<string, ActiveTween> {
  let map = tweensByTarget.get(target);
  if (!map) {
    map = new Map();
    tweensByTarget.set(target, map);
  }
  return map;
}

function gsapTo(target: object, vars: TweenVars): TweenControl {
  const { duration = 0.5, ease = 'power2.out', overwrite, onUpdate, onComplete, ...props } = vars;

  const tweenMap = getTweenMap(target);

  // Build property map
  const propMap: Record<string, { start: number; end: number }> = {};

  for (const [key, endValue] of Object.entries(props)) {
    if (typeof endValue !== 'number') continue;

    // Kill existing tween on this property if overwrite
    if (overwrite === true || overwrite === 'auto') {
      const existing = tweenMap.get(key);
      if (existing) {
        existing.stopped = true;
        tweenMap.delete(key);
      }
    }

    const startValue = (target as Record<string, number>)[key];
    if (startValue === undefined) continue;

    propMap[key] = { start: startValue, end: endValue };
  }

  if (Object.keys(propMap).length === 0) {
    onComplete?.();
    return { kill() {}, isActive() { return false; } };
  }

  const tween: ActiveTween = {
    target,
    props: propMap,
    startTime: performance.now(),
    duration: duration * 1000,
    easing: getEasing(ease),
    onUpdate,
    onComplete,
    stopped: false,
  };

  // Store reference for each property
  for (const key of Object.keys(propMap)) {
    tweenMap.set(key, tween);
  }

  activeTweens.add(tween);
  startLoop();

  return {
    kill() {
      tween.stopped = true;
      for (const key of Object.keys(propMap)) {
        tweenMap.delete(key);
      }
    },
    isActive() {
      return !tween.stopped && activeTweens.has(tween);
    },
  };
}

function gsapFromTo(target: object, fromVars: Record<string, number>, toVars: TweenVars): TweenControl {
  // Set initial values
  for (const [key, value] of Object.entries(fromVars)) {
    if (typeof value === 'number') {
      (target as Record<string, number>)[key] = value;
    }
  }
  return gsapTo(target, toVars);
}

function gsapTimeline(_vars?: { overwrite?: boolean }): Timeline {
  const chain: Array<{ target: object; vars: TweenVars }> = [];
  const controls: TweenControl[] = [];
  let running = false;
  let killed = false;

  async function runChain(): Promise<void> {
    for (const { target, vars } of chain) {
      if (killed) break;
      await new Promise<void>(resolve => {
        const ctrl = gsapTo(target, {
          ...vars,
          onComplete: () => {
            vars.onComplete?.();
            resolve();
          },
        });
        controls.push(ctrl);
      });
    }
  }

  const tl: Timeline = {
    to(target: object, vars: TweenVars): Timeline {
      chain.push({ target, vars });
      if (!running) {
        running = true;
        runChain();
      }
      return tl;
    },
    kill() {
      killed = true;
      for (const ctrl of controls) {
        ctrl.kill();
      }
    },
  };

  return tl;
}

// Export GSAP-compatible API
export const gsap = {
  to: gsapTo,
  fromTo: gsapFromTo,
  timeline: gsapTimeline,
};

// --- AnimatedValue utilities ---

export interface AnimatedValue {
  value: number;
  tween?: TweenControl;
}

export function createAnimatedValue(initial: number): AnimatedValue {
  return { value: initial };
}

export const ease = {
  decay: 'power2.out',
  snap: 'power3.out',
  smooth: 'power1.inOut',
  bounce: 'elastic.out(1, 0.5)',
  spring: 'elastic.out(1, 0.75)',
  punch: 'power4.out',
};

export function animateTo(
  target: AnimatedValue,
  endValue: number,
  duration: number,
  easing: string = ease.smooth,
  onUpdate?: () => void
): TweenControl {
  if (target.tween) {
    target.tween.kill();
  }

  target.tween = gsap.to(target, {
    value: endValue,
    duration,
    ease: easing,
    onUpdate,
    onComplete: () => {
      target.tween = undefined;
    },
  });

  return target.tween;
}

export function decayTo(
  target: AnimatedValue,
  endValue: number,
  halfLife: number,
  onUpdate?: () => void
): TweenControl {
  const duration = halfLife * 4;
  return animateTo(target, endValue, duration, ease.decay, onUpdate);
}

export function snapTo(
  target: AnimatedValue,
  endValue: number,
  snapRate: number = 5,
  onUpdate?: () => void
): TweenControl {
  const duration = 3 / snapRate;
  return animateTo(target, endValue, duration, ease.snap, onUpdate);
}

export function punch(
  target: AnimatedValue,
  peakValue: number,
  decayDuration: number = 0.3,
  onUpdate?: () => void
): TweenControl {
  target.value = peakValue;
  return animateTo(target, 0, decayDuration, ease.punch, onUpdate);
}

export function impulse(
  target: AnimatedValue,
  addValue: number,
  decayDuration: number = 0.5,
  onUpdate?: () => void
): TweenControl {
  const newPeak = target.value + addValue;
  if (target.tween) {
    target.tween.kill();
  }
  target.value = newPeak;
  return animateTo(target, 0, decayDuration, ease.decay, onUpdate);
}

export function springTo(
  target: AnimatedValue,
  endValue: number,
  duration: number = 0.6,
  onUpdate?: () => void
): TweenControl {
  return animateTo(target, endValue, duration, ease.spring, onUpdate);
}

export function createTimeline(defaults?: { overwrite?: boolean }): Timeline {
  return gsap.timeline(defaults);
}

export function getValue(target: AnimatedValue): number {
  return target.value;
}

export function setValue(target: AnimatedValue, value: number): void {
  if (target.tween) {
    target.tween.kill();
    target.tween = undefined;
  }
  target.value = value;
}

export function isAnimating(target: AnimatedValue): boolean {
  return target.tween !== undefined && target.tween.isActive();
}

export function manualDecay(value: number, rate: number, dt: number): number {
  return value * Math.exp(-rate * dt);
}

export function manualSnap(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}

// No-op for compatibility (our system uses its own RAF loop)
export function updateTweens(_time?: number): void {
  // Not needed - we manage our own animation loop
}
