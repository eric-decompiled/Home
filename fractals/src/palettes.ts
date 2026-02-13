// --- Chromatic Color Palettes ---
// 12 palettes indexed by pitch class (C=0 .. B=11)
// Anchors: A=red(Fire), E=blue(Ocean), G=green(Emerald)

export type RGB = [number, number, number];

export interface PaletteDef {
  name: string;
  stops: { pos: number; color: RGB }[];
}

export const palettes: PaletteDef[] = [
  { // 0 - C - Silver Grey
    name: 'C',
    stops: [
      { pos: 0.0,  color: [3, 3, 4] },
      { pos: 0.15, color: [35, 38, 45] },
      { pos: 0.4,  color: [100, 108, 120] },
      { pos: 0.65, color: [150, 160, 175] },
      { pos: 0.85, color: [200, 210, 225] },
      { pos: 1.0,  color: [130, 140, 155] },
    ],
  },
  { // 1 - C# - Warm Violet (shifted warmer from C/D)
    name: 'C\u266F',
    stops: [
      { pos: 0.0,  color: [4, 0, 4] },
      { pos: 0.15, color: [45, 10, 50] },
      { pos: 0.4,  color: [130, 50, 140] },
      { pos: 0.65, color: [170, 85, 175] },
      { pos: 0.85, color: [195, 120, 200] },
      { pos: 1.0,  color: [155, 80, 160] },
    ],
  },
  { // 2 - D - Deep Purple
    name: 'D',
    stops: [
      { pos: 0.0,  color: [5, 0, 8] },
      { pos: 0.15, color: [35, 5, 55] },
      { pos: 0.4,  color: [100, 25, 150] },
      { pos: 0.65, color: [140, 50, 190] },
      { pos: 0.85, color: [175, 90, 220] },
      { pos: 1.0,  color: [130, 60, 175] },
    ],
  },
  { // 3 - D# - Electric Indigo (saturated blue-violet)
    name: 'D\u266F',
    stops: [
      { pos: 0.0,  color: [2, 0, 8] },
      { pos: 0.15, color: [30, 10, 70] },
      { pos: 0.4,  color: [80, 30, 170] },
      { pos: 0.65, color: [110, 55, 210] },
      { pos: 0.85, color: [140, 85, 240] },
      { pos: 1.0,  color: [100, 50, 190] },
    ],
  },
  { // 4 - E - Deep Blue
    name: 'E',
    stops: [
      { pos: 0.0,  color: [0, 0, 8] },
      { pos: 0.15, color: [0, 10, 45] },
      { pos: 0.4,  color: [5, 35, 100] },
      { pos: 0.65, color: [15, 60, 140] },
      { pos: 0.85, color: [30, 90, 180] },
      { pos: 1.0,  color: [10, 45, 110] },
    ],
  },
  { // 5 - F - Aqua/Cyan (more green-leaning for contrast with E)
    name: 'F',
    stops: [
      { pos: 0.0,  color: [0, 5, 5] },
      { pos: 0.15, color: [0, 50, 50] },
      { pos: 0.4,  color: [0, 160, 150] },
      { pos: 0.65, color: [30, 210, 195] },
      { pos: 0.85, color: [80, 240, 225] },
      { pos: 1.0,  color: [45, 195, 180] },
    ],
  },
  { // 6 - F# - Warm Teal (shifted warmer from F/G)
    name: 'F\u266F',
    stops: [
      { pos: 0.0,  color: [0, 4, 3] },
      { pos: 0.15, color: [10, 40, 35] },
      { pos: 0.4,  color: [50, 130, 110] },
      { pos: 0.65, color: [85, 170, 145] },
      { pos: 0.85, color: [120, 200, 175] },
      { pos: 1.0,  color: [75, 155, 130] },
    ],
  },
  { // 7 - G - Green (Deep Forest)
    name: 'G',
    stops: [
      { pos: 0.0,  color: [0, 3, 0] },
      { pos: 0.15, color: [2, 25, 5] },
      { pos: 0.4,  color: [10, 65, 20] },
      { pos: 0.65, color: [20, 95, 35] },
      { pos: 0.85, color: [35, 130, 50] },
      { pos: 1.0,  color: [15, 80, 28] },
    ],
  },
  { // 8 - G# - Orange (between green and red)
    name: 'G\u266F',
    stops: [
      { pos: 0.0,  color: [4, 1, 0] },
      { pos: 0.15, color: [50, 20, 0] },
      { pos: 0.4,  color: [160, 70, 0] },
      { pos: 0.65, color: [210, 100, 10] },
      { pos: 0.85, color: [240, 140, 30] },
      { pos: 1.0,  color: [180, 80, 5] },
    ],
  },
  { // 9 - A - Red (Deep)
    name: 'A',
    stops: [
      { pos: 0.0,  color: [3, 0, 0] },
      { pos: 0.15, color: [40, 5, 5] },
      { pos: 0.4,  color: [120, 15, 10] },
      { pos: 0.65, color: [170, 25, 20] },
      { pos: 0.85, color: [210, 40, 30] },
      { pos: 1.0,  color: [140, 20, 15] },
    ],
  },
  { // 10 - A# - Dusty Mauve (purple-shifted to contrast with red A)
    name: 'A\u266F',
    stops: [
      { pos: 0.0,  color: [4, 1, 4] },
      { pos: 0.15, color: [45, 20, 50] },
      { pos: 0.4,  color: [140, 65, 130] },
      { pos: 0.65, color: [175, 100, 165] },
      { pos: 0.85, color: [200, 135, 190] },
      { pos: 1.0,  color: [160, 90, 150] },
    ],
  },
  { // 11 - B - Fuchsia
    name: 'B',
    stops: [
      { pos: 0.0,  color: [5, 0, 3] },
      { pos: 0.15, color: [50, 0, 35] },
      { pos: 0.4,  color: [170, 15, 110] },
      { pos: 0.65, color: [215, 55, 160] },
      { pos: 0.85, color: [235, 110, 195] },
      { pos: 1.0,  color: [195, 65, 155] },
    ],
  },
];
