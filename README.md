# Mini Forward Algorithm

An interactive browser simulation for visualizing belief propagation in Markov Models — built as a teaching tool for AI/ML courses.

The core operation it demonstrates is the **Mini Forward Algorithm** time-update step:

> **B′(X′) = Σₓ P(X′|x) · B(x)**

Each step shows how a probability distribution over states evolves through one application of the transition matrix, with every part of the computation visible simultaneously.

## Screenshot

The app has five panels that are always on screen together:

| Panel | What it shows |
|---|---|
| **State Transition Graph** | SVG diagram with curved arrows sized by transition probability; nodes display current belief as a fill arc |
| **Belief Distribution** | Animated bar chart of B(Xₜ), labeled with the current time step |
| **Computation** | Full expanded arithmetic of the update — `B′(Rain) = 0.10 × 0.700 + 0.80 × 0.300 = 0.3100` — color-coded by source state |
| **Transition Matrix & Initial Belief** | Live-editable matrix (rows auto-normalize) and initial belief sliders |
| **Belief History** | Scrollable timeline of mini bar charts, one per step; click any to jump back |

## Getting Started

```bash
npm install
npm run dev
```

Then open `http://localhost:5173`.

## Usage

**Controls:**
- **Step →** / **← Back** — move one time step forward or backward
- **▶ Play** / **‖ Pause** — auto-advance continuously
- **↺ Reset** — return to t = 0
- **Speed slider** — 0.5× to 4× playback speed
- **Preset dropdown** — switch between built-in example models

**Things to try:**
- Press Play and watch the bars converge to the stationary distribution
- Edit a transition probability in the matrix (the row auto-normalizes on blur), then step forward to see the immediate effect in the Computation panel
- Adjust the Initial Belief sliders, press Normalize, then Reset to compare how different starting distributions reach the same stationary distribution
- Set Speed to 0.5× and watch the contribution-pulse phase — thicker, brighter arrows show which edges are carrying the most probability mass

## Preset Models

| Model | States | Demonstrates |
|---|---|---|
| Weather (2 states) | Sun, Rain | Rapid convergence to a ~67/33 stationary distribution |
| Robot Location (3 states) | Left, Center, Right | Diffusion from a certain starting position |
| Market Mood (4 states) | Bull, Neutral, Bear, Crash | Multi-state convergence with a recovery transition from Crash |

## Project Structure

```
src/
  algorithm.ts          # forwardStep() and computeContributions() — pure functions
  types.ts              # MarkovModel and AppState interfaces
  presets.ts            # Three example models + shared color palette
  main.ts               # App state + action functions; wires all components together
  styles.css            # Dark-theme layout and all component styles
  components/
    StateGraph.ts       # SVG graph with bezier edges, self-loops, belief arcs
    BeliefBars.ts       # SVG bar chart with CSS scaleY() transitions
    MathStep.ts         # Renders the full expanded formula
    MatrixEditor.ts     # Editable matrix table + initial belief sliders
    Timeline.ts         # Scrollable strip of mini bar charts
    Controls.ts         # Preset picker, playback buttons, speed slider
```

## Tech Stack

- **TypeScript** + **Vite** — no framework, no runtime dependencies
- **SVG** for all graphics — scales cleanly, supports CSS transitions
- Pure **CSS `transform: scaleY()`** for bar animation (cross-browser reliable)

## Scope

This is the pure time-update step of the forward algorithm — no observation model, no evidence, no HMM filtering. It is intentionally minimal to keep the focus on what the transition matrix does to a belief distribution over time.
