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
  { // 1 - C# - Cool Mauve (muted purple-grey)
    name: 'C\u266F',
    stops: [
      { pos: 0.0,  color: [3, 2, 4] },
      { pos: 0.15, color: [35, 28, 45] },
      { pos: 0.4,  color: [85, 70, 105] },
      { pos: 0.65, color: [120, 100, 140] },
      { pos: 0.85, color: [150, 130, 170] },
      { pos: 1.0,  color: [105, 85, 125] },
    ],
  },
  { // 2 - D - Deep Purple
    name: 'D',
    stops: [
      { pos: 0.0,  color: [4, 0, 6] },
      { pos: 0.15, color: [30, 5, 50] },
      { pos: 0.4,  color: [85, 20, 130] },
      { pos: 0.65, color: [120, 40, 170] },
      { pos: 0.85, color: [155, 70, 200] },
      { pos: 1.0,  color: [105, 45, 150] },
    ],
  },
  { // 3 - D# - Dusty Violet (muted accidental)
    name: 'D\u266F',
    stops: [
      { pos: 0.0,  color: [3, 1, 5] },
      { pos: 0.15, color: [35, 20, 55] },
      { pos: 0.4,  color: [90, 55, 130] },
      { pos: 0.65, color: [125, 85, 160] },
      { pos: 0.85, color: [155, 115, 185] },
      { pos: 1.0,  color: [110, 75, 145] },
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
  { // 5 - F - Deep Teal
    name: 'F',
    stops: [
      { pos: 0.0,  color: [0, 3, 3] },
      { pos: 0.15, color: [0, 25, 28] },
      { pos: 0.4,  color: [5, 75, 80] },
      { pos: 0.65, color: [15, 110, 115] },
      { pos: 0.85, color: [30, 145, 150] },
      { pos: 1.0,  color: [10, 95, 100] },
    ],
  },
  { // 6 - F# - Dusty Cyan (muted accidental)
    name: 'F\u266F',
    stops: [
      { pos: 0.0,  color: [2, 4, 5] },
      { pos: 0.15, color: [25, 50, 55] },
      { pos: 0.4,  color: [70, 130, 140] },
      { pos: 0.65, color: [100, 165, 175] },
      { pos: 0.85, color: [130, 195, 205] },
      { pos: 1.0,  color: [90, 150, 160] },
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
  { // 10 - A# - Dusty Coral (warm muted accidental)
    name: 'A\u266F',
    stops: [
      { pos: 0.0,  color: [4, 2, 2] },
      { pos: 0.15, color: [50, 25, 25] },
      { pos: 0.4,  color: [145, 75, 70] },
      { pos: 0.65, color: [180, 110, 100] },
      { pos: 0.85, color: [210, 145, 130] },
      { pos: 1.0,  color: [165, 100, 90] },
    ],
  },
  { // 11 - B - Deep Pink
    name: 'B',
    stops: [
      { pos: 0.0,  color: [5, 0, 2] },
      { pos: 0.15, color: [45, 0, 25] },
      { pos: 0.4,  color: [140, 10, 75] },
      { pos: 0.65, color: [185, 30, 110] },
      { pos: 0.85, color: [220, 60, 145] },
      { pos: 1.0,  color: [165, 35, 100] },
    ],
  },
];
