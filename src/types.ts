export interface MarkovModel {
  name: string;
  states: string[];
  transition: number[][];  // T[from][to], rows sum to 1
  initialBelief: number[];  // sums to 1
}

export interface AppState {
  model: MarkovModel;
  history: number[][];  // history[t] = belief at step t
  currentStep: number;
  isPlaying: boolean;
  animating: boolean;
  pendingContributions: number[][] | null;
  speed: number;
}
