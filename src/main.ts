import type { AppState, MarkovModel } from './types';
import { forwardStep, computeContributions } from './algorithm';
import { PRESETS } from './presets';
import { StateGraph } from './components/StateGraph';
import { BeliefBars } from './components/BeliefBars';
import { MathStep } from './components/MathStep';
import { MatrixEditor } from './components/MatrixEditor';
import { Timeline } from './components/Timeline';
import { Controls } from './components/Controls';

// ── App state ────────────────────────────────────────────────────────────────

const state: AppState = {
  model: deepCloneModel(PRESETS[0]),
  history: [],
  currentStep: 0,
  isPlaying: false,
  animating: false,
  pendingContributions: null,
  speed: 1,
};

function deepCloneModel(m: MarkovModel): MarkovModel {
  return {
    name: m.name,
    states: [...m.states],
    transition: m.transition.map(r => [...r]),
    initialBelief: [...m.initialBelief],
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Component instantiation ──────────────────────────────────────────────────

const stateGraph = new StateGraph(document.getElementById('state-graph')!);
const beliefBars = new BeliefBars(document.getElementById('belief-bars')!);
const mathStep = new MathStep(document.getElementById('math-step')!);
const matrixEditor = new MatrixEditor(document.getElementById('matrix-editor')!);
const timeline = new Timeline(document.getElementById('timeline')!);
const controls = new Controls(document.getElementById('controls-container')!);

// ── Wire up callbacks ────────────────────────────────────────────────────────

controls.onStepForward = () => { void doStepForward(); };
controls.onStepBack = () => doStepBack();
controls.onReset = () => doReset();
controls.onPlay = () => { void doPlay(); };
controls.onPause = () => doStop();
controls.onSpeedChange = (s) => { state.speed = s; };
controls.onPresetChange = (idx) => loadPreset(idx);

matrixEditor.onTransitionChange = (T) => {
  state.model.transition = T;
  resetHistory();
  renderAll();
};

matrixEditor.onInitialBeliefChange = (b) => {
  state.model.initialBelief = b;
  resetHistory();
  renderAll();
};

timeline.onStepSelect = (t) => {
  if (state.animating) return;
  state.currentStep = t;
  renderAll();
};

// ── Bootstrap ────────────────────────────────────────────────────────────────

function initModel(): void {
  stateGraph.buildModel(state.model);
  beliefBars.buildModel(state.model);
  matrixEditor.build(state.model);
  resetHistory();
  renderAll();
}

function resetHistory(): void {
  state.history = [[...state.model.initialBelief]];
  state.currentStep = 0;
  state.pendingContributions = null;
}

// ── Render ───────────────────────────────────────────────────────────────────

function renderAll(): void {
  const belief = state.history[state.currentStep];

  // State graph
  if (state.pendingContributions) {
    stateGraph.showContributions(state.pendingContributions, state.model.states.length);
  } else {
    stateGraph.clearContributions();
    stateGraph.updateBelief(belief);
  }

  beliefBars.updateBelief(belief);
  timeline.update(state);
  controls.update(state);

  const badge = document.getElementById('step-badge');
  if (badge) badge.textContent = `t = ${state.currentStep}`;
}

// ── Actions ──────────────────────────────────────────────────────────────────

async function doStepForward(): Promise<void> {
  if (state.animating) return;
  state.animating = true;

  const currentBelief = state.history[state.currentStep];

  // If we already have a precomputed future step, just jump to it
  if (state.currentStep < state.history.length - 1) {
    state.currentStep++;
    state.animating = false;
    renderAll();
    return;
  }

  const newBelief = forwardStep(currentBelief, state.model.transition);
  const contributions = computeContributions(currentBelief, state.model.transition);

  // Phase 1: Show contribution arrows
  state.pendingContributions = contributions;
  controls.update(state);
  stateGraph.showContributions(contributions, state.model.states.length);

  await sleep(700 / state.speed);

  // Phase 2: Commit new belief, animate bars
  state.pendingContributions = null;
  state.history.push(newBelief);
  state.currentStep++;

  stateGraph.clearContributions();
  stateGraph.updateBelief(newBelief);
  beliefBars.updateBelief(newBelief);
  mathStep.update(state.model, currentBelief, newBelief, contributions);
  timeline.update(state);

  const badge = document.getElementById('step-badge');
  if (badge) badge.textContent = `t = ${state.currentStep}`;

  await sleep(450 / state.speed);
  state.animating = false;
  controls.update(state);
}

function doStepBack(): void {
  if (state.animating || state.currentStep === 0) return;
  state.currentStep--;
  renderAll();
  mathStep.showPlaceholder();
}

function doReset(): void {
  if (state.animating) return;
  doStop();
  state.currentStep = 0;
  mathStep.showPlaceholder();
  renderAll();
}

let playTimer: ReturnType<typeof setTimeout> | null = null;

async function doPlay(): Promise<void> {
  if (state.isPlaying) return;
  state.isPlaying = true;
  controls.update(state);

  const tick = async () => {
    if (!state.isPlaying) return;
    await doStepForward();
    if (state.isPlaying) {
      playTimer = setTimeout(() => void tick(), 200 / state.speed);
    }
  };

  void tick();
}

function doStop(): void {
  state.isPlaying = false;
  if (playTimer !== null) {
    clearTimeout(playTimer);
    playTimer = null;
  }
  controls.update(state);
}

function loadPreset(idx: number): void {
  if (state.animating) return;
  doStop();
  state.model = deepCloneModel(PRESETS[idx]);
  mathStep.showPlaceholder();
  initModel();
}

// ── Start ────────────────────────────────────────────────────────────────────

initModel();
