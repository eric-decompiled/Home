// --- Chromatic Color Palettes ---
// 12 palettes indexed by pitch class (C=0 .. B=11)
// Circle of Fifths rainbow: C=Silver, A=Red, E=Blue
// Flow: Silver→Yellow→Gold→Red→Blue→Indigo→Violet→Purple→Magenta→Pink→Coral→Orange→Silver

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
  { // 1 - C# - Orange
    name: 'C\u266F',
    stops: [
      { pos: 0.0,  color: [4, 1, 0] },
      { pos: 0.15, color: [50, 20, 0] },
      { pos: 0.4,  color: [160, 70, 0] },
      { pos: 0.65, color: [210, 100, 10] },
      { pos: 0.85, color: [240, 140, 30] },
      { pos: 1.0,  color: [180, 80, 5] },
    ],
  },
  { // 2 - D - Dark Purple
    name: 'D',
    stops: [
      { pos: 0.0,  color: [3, 0, 4] },
      { pos: 0.15, color: [25, 5, 35] },
      { pos: 0.4,  color: [65, 15, 95] },
      { pos: 0.65, color: [90, 25, 130] },
      { pos: 0.85, color: [120, 40, 165] },
      { pos: 1.0,  color: [80, 20, 115] },
    ],
  },
  { // 3 - D# - Pastel Violet
    name: 'D\u266F',
    stops: [
      { pos: 0.0,  color: [4, 2, 6] },
      { pos: 0.15, color: [50, 30, 65] },
      { pos: 0.4,  color: [160, 110, 190] },
      { pos: 0.65, color: [195, 145, 225] },
      { pos: 0.85, color: [225, 175, 250] },
      { pos: 1.0,  color: [180, 130, 210] },
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
  { // 5 - F - Deep Gold
    name: 'F',
    stops: [
      { pos: 0.0,  color: [4, 2, 0] },
      { pos: 0.15, color: [45, 28, 0] },
      { pos: 0.4,  color: [140, 90, 5] },
      { pos: 0.65, color: [175, 115, 10] },
      { pos: 0.85, color: [210, 145, 20] },
      { pos: 1.0,  color: [160, 100, 5] },
    ],
  },
  { // 6 - F# - Yellow
    name: 'F\u266F',
    stops: [
      { pos: 0.0,  color: [4, 4, 0] },
      { pos: 0.15, color: [55, 50, 5] },
      { pos: 0.4,  color: [200, 180, 15] },
      { pos: 0.65, color: [235, 215, 30] },
      { pos: 0.85, color: [255, 240, 50] },
      { pos: 1.0,  color: [215, 195, 25] },
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
  { // 8 - G# - Teal
    name: 'G\u266F',
    stops: [
      { pos: 0.0,  color: [0, 3, 4] },
      { pos: 0.15, color: [5, 35, 40] },
      { pos: 0.4,  color: [15, 110, 120] },
      { pos: 0.65, color: [25, 150, 160] },
      { pos: 0.85, color: [40, 190, 200] },
      { pos: 1.0,  color: [20, 130, 140] },
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
  { // 10 - A# - Coral (CoF position 10)
    name: 'A\u266F',
    stops: [
      { pos: 0.0,  color: [5, 2, 2] },
      { pos: 0.15, color: [55, 28, 25] },
      { pos: 0.4,  color: [190, 95, 80] },
      { pos: 0.65, color: [225, 130, 110] },
      { pos: 0.85, color: [250, 165, 140] },
      { pos: 1.0,  color: [210, 115, 95] },
    ],
  },
  { // 11 - B - Lime
    name: 'B',
    stops: [
      { pos: 0.0,  color: [2, 4, 0] },
      { pos: 0.15, color: [30, 50, 5] },
      { pos: 0.4,  color: [100, 160, 20] },
      { pos: 0.65, color: [140, 200, 35] },
      { pos: 0.85, color: [180, 235, 50] },
      { pos: 1.0,  color: [120, 180, 30] },
    ],
  },
];
