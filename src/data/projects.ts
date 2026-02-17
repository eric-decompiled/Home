export interface Project {
  slug: string;
  title: string;
  description: string;
  image?: string;
  tier?: 'gold' | 'silver' | 'bronze';
}

export const projects: Project[] = [
  {
    slug: 'fractured-jukebox',
    title: 'Fractured Jukebox',
    description: 'Turn any MIDI file into a living visual experience with procedural graphics',
    image: '/images/projects/fractured-jukebox.png',
    tier: 'gold',
  },
  {
    slug: 'lissajous',
    title: 'Lissajous',
    description: 'Visualize Lissajous curves and their relationship to musical intervals',
    image: '/images/projects/lissajous.png',
    tier: 'silver',
  },
  {
    slug: 'sound-synth',
    title: 'Sound Synth',
    description: 'Interactive harmonics explorer for understanding sound and timbre',
    image: '/images/projects/sound-synth.png',
  },
  {
    slug: 'resonator',
    title: 'Resonator',
    description: 'Real-time RLC resonator explorer for audio synthesis and visualization',
    image: '/images/projects/resonator.png',
    tier: 'bronze',
  },
  {
    slug: 'karplus-strong',
    title: 'Karplus-Strong',
    description: 'Explore the Karplus-Strong algorithm to synth plucked string sounds',
    image: '/images/projects/karplus-strong.png',
  },
  {
    slug: 'intervals',
    title: 'Intervals',
    description: 'Ear training for musical intervals with adaptive difficulty and Lissajous visualization',
    image: '/images/projects/intervals.png',
  },
];
