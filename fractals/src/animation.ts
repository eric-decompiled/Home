// --- GSAP Animation Utilities ---
// Centralized animation system for consistent transitions across effects

import gsap from 'gsap';

// Re-export gsap for direct use where needed
export { gsap };

// --- Tween Targets ---
// Objects that hold animated values - GSAP tweens these directly

export interface AnimatedValue {
  value: number;
  tween?: gsap.core.Tween;
}

export function createAnimatedValue(initial: number): AnimatedValue {
  return { value: initial };
}

// --- Common Easing Curves ---
// Named presets matching the feel of previous manual animations

export const ease = {
  // Exponential decay feel - fast start, slow finish
  decay: 'power2.out',
  // Snap to target - quick response
  snap: 'power3.out',
  // Smooth blend - even transition
  smooth: 'power1.inOut',
  // Bounce for drum hits
  bounce: 'elastic.out(1, 0.5)',
  // Spring physics feel
  spring: 'elastic.out(1, 0.75)',
  // Quick attack, slow release (for energy/brightness)
  punch: 'power4.out',
};

// --- Animation Functions ---

/**
 * Animate a value with automatic tween management
 * Kills any existing tween on the target before starting new one
 */
export function animateTo(
  target: AnimatedValue,
  endValue: number,
  duration: number,
  easing: string = ease.smooth,
  onUpdate?: () => void
): gsap.core.Tween {
  // Kill existing tween to prevent conflicts
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
    }
  });

  return target.tween;
}

/**
 * Decay a value toward zero (replaces Math.exp decay pattern)
 * halfLife in seconds - time to reach 50% of current value
 */
export function decayTo(
  target: AnimatedValue,
  endValue: number,
  halfLife: number,
  onUpdate?: () => void
): gsap.core.Tween {
  // Convert half-life to duration (reach ~1% in 6.64 half-lives)
  const duration = halfLife * 4;
  return animateTo(target, endValue, duration, ease.decay, onUpdate);
}

/**
 * Quick snap to target (replaces 1 - Math.exp(-rate * dt) pattern)
 * snapRate: higher = faster snap (maps roughly to old rate parameter)
 */
export function snapTo(
  target: AnimatedValue,
  endValue: number,
  snapRate: number = 5,
  onUpdate?: () => void
): gsap.core.Tween {
  const duration = 3 / snapRate; // Approximate mapping
  return animateTo(target, endValue, duration, ease.snap, onUpdate);
}

/**
 * Punch effect - quick spike then decay (for drum hits, onsets)
 */
export function punch(
  target: AnimatedValue,
  peakValue: number,
  decayDuration: number = 0.3,
  onUpdate?: () => void
): gsap.core.Tween {
  // Instantly set to peak, then decay
  target.value = peakValue;
  return animateTo(target, 0, decayDuration, ease.punch, onUpdate);
}

/**
 * Add impulse to current value then decay (for additive effects)
 */
export function impulse(
  target: AnimatedValue,
  addValue: number,
  decayDuration: number = 0.5,
  onUpdate?: () => void
): gsap.core.Tween {
  const newPeak = target.value + addValue;
  if (target.tween) {
    target.tween.kill();
  }
  target.value = newPeak;
  return animateTo(target, 0, decayDuration, ease.decay, onUpdate);
}

/**
 * Spring animation (for drum bounce, elastic effects)
 */
export function springTo(
  target: AnimatedValue,
  endValue: number,
  duration: number = 0.6,
  onUpdate?: () => void
): gsap.core.Tween {
  return animateTo(target, endValue, duration, ease.spring, onUpdate);
}

// --- Timeline Utilities ---

/**
 * Create a timeline for sequenced animations
 */
export function createTimeline(defaults?: gsap.TimelineVars): gsap.core.Timeline {
  return gsap.timeline(defaults);
}

// --- Frame-synced Updates ---
// For values that need per-frame reading but GSAP-managed transitions

/**
 * Get current interpolated value
 * Safe to call every frame - returns current tween progress
 */
export function getValue(target: AnimatedValue): number {
  return target.value;
}

/**
 * Immediately set value (no animation)
 */
export function setValue(target: AnimatedValue, value: number): void {
  if (target.tween) {
    target.tween.kill();
    target.tween = undefined;
  }
  target.value = value;
}

/**
 * Check if currently animating
 */
export function isAnimating(target: AnimatedValue): boolean {
  return target.tween !== undefined && target.tween.isActive();
}

// --- Utility: Manual decay for cases where GSAP overhead isn't wanted ---
// (e.g., hundreds of particles)

export function manualDecay(value: number, rate: number, dt: number): number {
  return value * Math.exp(-rate * dt);
}

export function manualSnap(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt));
}
