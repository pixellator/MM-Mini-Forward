import type { MarkovModel } from './types';

export const PRESETS: MarkovModel[] = [
  {
    name: 'Weather (2 states)',
    states: ['Sun', 'Rain'],
    transition: [
      [0.9, 0.1],
      [0.2, 0.8],
    ],
    initialBelief: [1.0, 0.0],
  },
  {
    name: 'Robot Location (3 states)',
    states: ['Left', 'Center', 'Right'],
    transition: [
      [0.2, 0.6, 0.2],
      [0.2, 0.4, 0.4],
      [0.1, 0.5, 0.4],
    ],
    initialBelief: [1.0, 0.0, 0.0],
  },
  {
    name: 'Market Mood (4 states)',
    states: ['Bull', 'Neutral', 'Bear', 'Crash'],
    transition: [
      [0.6, 0.3, 0.1, 0.0],
      [0.2, 0.5, 0.2, 0.1],
      [0.1, 0.3, 0.4, 0.2],
      [0.3, 0.2, 0.3, 0.2],
    ],
    initialBelief: [1.0, 0.0, 0.0, 0.0],
  },
];

export const STATE_COLORS = ['#4C9BE8', '#E85C4C', '#48C774', '#FFAA00', '#B45BE8'];
