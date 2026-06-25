# Mini Forward Algorithm — Simulation Report

**Project:** MM-Mini-Forward  
**Date:** June 2026  
**Tech stack:** TypeScript, Vite, SVG (no external runtime dependencies)

---

## Part A: How to Use the Simulation

### Starting the App

From the project directory, run:

```
npm run dev
```

Then open `http://localhost:5173` in a browser. The app runs entirely in the browser — there is no server-side logic.

---

### The Five Panels

The app is laid out as five panels that are always visible at the same time. This is a deliberate design choice: every part of the computation is on screen simultaneously so students can trace the algorithm without switching views.

#### 1. State Transition Graph (top left)

A circular SVG diagram with one node per state. Arrows between nodes show transition probabilities, labeled with their values. Arrow thickness and opacity scale with the probability weight, so high-probability transitions are visually dominant.

Each node contains:
- The state name
- A circular arc that fills proportionally to the current belief in that state
- A percentage label (e.g. `70.0%`)

When a step is executed, the arrows pulse briefly to show which transitions are carrying probability mass — thicker, brighter arrows indicate higher contribution to the next belief.

#### 2. Belief Distribution Bar Chart (top right)

An SVG bar chart showing the current probability distribution B(Xₜ). Each bar corresponds to one state, color-coded consistently with the state graph. Bars animate smoothly to new heights when the belief updates. A step badge (e.g. `t = 3`) shows the current time step.

#### 3. Computation Panel (middle)

After each forward step, this panel shows the full expanded arithmetic of the update equation:

```
B'(Rain) = 0.10 × 0.700 + 0.80 × 0.300 = 0.0700 + 0.2400 = 0.3100
```

Every term is color-coded to its source state, and the equation is shown in full — no summation shorthand. This is the heart of the pedagogical design: the algebra is never hidden.

Before the first step is taken, a placeholder prompts the student to press **Step Forward**.

#### 4. Transition Matrix & Initial Belief Editor (bottom left)

Two editable sub-panels:

**Transition Matrix** — a table with one row per source state and one column per destination state. Each cell is a number input (range 0–1). A "sum" column on the right shows the row total and turns red if it deviates from 1.0. On blur (when a cell loses focus), the row is automatically renormalized to sum to 1.

**Initial Belief B₀** — a set of sliders and number inputs, one per state, setting the starting distribution. A "Sum" indicator and a **Normalize** button let students set an unnormalized distribution and fix it in one click.

Any edit to either section resets the simulation to t = 0 and recalculates from the new starting point.

#### 5. Belief History Timeline (bottom)

A scrollable horizontal strip with one mini bar chart per time step visited. Clicking any step jumps the main view to that time step. The current step is highlighted. The timeline auto-scrolls to keep the current step visible.

---

### Controls

The control bar sits just below the header and contains:

| Control | Function |
|---|---|
| Preset dropdown | Switches between the three built-in example models |
| ← Back | Steps one time step backward through stored history |
| ▶ Play | Auto-advances steps continuously |
| ‖ Pause | Stops auto-play |
| Step → | Advances one time step forward |
| ↺ Reset | Returns to t = 0 (preserves the model) |
| Speed slider | 0.5× to 4× speed multiplier for auto-play |

Back, Reset, and the preset selector are disabled during animations to prevent state corruption.

---

### The Three Preset Models

| Preset | States | What to observe |
|---|---|---|
| **Weather (2 states)** | Sun, Rain | Starting certain in Sun, the belief converges to a stationary distribution (~67% Sun, ~33% Rain) after about 15 steps |
| **Robot Location (3 states)** | Left, Center, Right | A robot starting at Left gradually diffuses toward Center and Right; the high Center-to-Right transition is visible as a thick arrow |
| **Market Mood (4 states)** | Bull, Neutral, Bear, Crash | Multi-state convergence; the Crash state has a recovery transition back to Bull, creating interesting oscillation before settling |

---

### Things to Try

- **Watch convergence**: press Play and observe that bars stop changing — this is the stationary distribution of the chain
- **Explore initial conditions**: edit the Initial Belief sliders, press Normalize, and Reset — compare how different starting distributions reach the same stationary distribution
- **Edit the matrix**: change a transition probability (the row auto-normalizes on blur), then step forward to see the immediate effect on the Computation panel
- **Step backward**: use ← Back or click a Timeline entry to revisit an earlier distribution and compare against the current one
- **Slow it down**: set Speed to 0.5× and step forward; the contribution-pulse phase is long enough to clearly see which edges are carrying probability mass

---

## Part B: How We Developed It

### Origin and Goal

The simulation was developed in a single session on June 21, 2026, using Claude Code (Sonnet 4.6). The starting prompt was:

> "Please make a plan for a browser app that demonstrates the 'Mini Forward Algorithm' for propagating belief distributions forward in time in a Markov Model. The focus should be on clarity of graphics to facilitate student understanding. Plan to write it in Typescript."

The context was an AI assessment course (Allen School, 2026), where the simulation would serve as a study aid for students learning belief propagation in Markov Models.

---

### Design Principles

The plan was organized around a single pedagogical constraint:

**Every part of the computation should be visible simultaneously.**

This ruled out tabbed layouts, progressive disclosure, or any design that required students to flip between views to understand the algorithm. It led directly to the five-panel layout described above.

A secondary constraint was **no distractions**: the app should have no menus, no settings modals, no navigation. Everything useful is on the main screen at all times.

A third constraint was **editability**: students should be able to change the model (both the matrix and the starting belief) without leaving the app or reloading. This led to the live matrix editor with automatic row normalization.

---

### Technology Choices

**Vite + TypeScript** was chosen for fast iteration and type safety without framework overhead. No runtime dependencies were added — React, D3, or similar libraries would have obscured the implementation and added unnecessary weight.

**SVG** was chosen for all graphics (state graph, belief bars, timeline mini-charts). SVG scales cleanly at any resolution, integrates naturally with CSS transitions, and allows precise geometric control over arrow curves and belief arcs.

**CSS `transform: scaleY()`** was chosen for bar animation rather than SVG attribute animation. SVG height attribute transitions are unreliable across browsers; `scaleY()` with `transform-origin` at the baseline is reliable and hardware-accelerated. Each bar rect is positioned to grow upward from a baseline group, so `scaleY(0.7)` correctly produces a bar 70% of full height.

---

### Architecture

The app follows a simple hub-and-spoke pattern: a single `AppState` object in `main.ts` is the source of truth, and all components receive data from it via explicit `update()` calls. Components expose callback slots (`onStepForward`, `onTransitionChange`, etc.) rather than emitting events, keeping the control flow readable.

```
main.ts (AppState + action functions)
  ├── Controls       → onStepForward, onPlay, onReset, onPresetChange, onSpeedChange
  ├── MatrixEditor   → onTransitionChange, onInitialBeliefChange
  ├── Timeline       → onStepSelect
  ├── StateGraph     (display only, reads belief / contributions)
  ├── BeliefBars     (display only, reads belief)
  └── MathStep       (display only, reads model + contributions + belief)
```

The algorithm itself (`algorithm.ts`) is two pure functions:
- `forwardStep(belief, T)` — computes the next belief vector via matrix-vector multiply
- `computeContributions(belief, T)` — returns the per-edge product `T[i][j] * belief[i]`, used for animating the contribution phase

This separation made it easy to reason about correctness and to reuse the contribution data in both the state graph animation and the MathStep display.

---

### Animation Design

The step-forward animation was the most design-sensitive part of the implementation. It plays in two phases, managed by `async/await` in `doStepForward()`:

**Phase 1 — Contribution phase (700ms):** Before the new belief is committed, the state graph shows highlighted edges with stroke-width and opacity proportional to each edge's contribution `T[i][j] * B(i)`. The higher-contribution edges become thick and bright; low-contribution edges fade. This makes visible _which transitions are doing the work_ before the result appears.

**Phase 2 — Update phase (450ms):** The highlighted edges reset. The new belief is pushed into history, bars animate to new heights via CSS transition, and the MathStep panel renders the full expanded formula with actual values.

Play mode uses a recursive async loop with a `setTimeout` inter-step delay scaled by the speed multiplier. The animation lock (`state.animating`) prevents concurrent steps.

---

### Development Sequence

The implementation followed this order in the session:

1. **Project scaffold** — Vite + TypeScript initialized, `tsconfig.json` and `vite.config.ts` configured
2. **Types and algorithm** — `types.ts` (interfaces) and `algorithm.ts` (pure functions) written first as the foundation
3. **Presets** — three example models defined in `presets.ts` with a shared color palette
4. **HTML shell** — `index.html` with semantic layout regions for each panel
5. **Components** — all six component classes written, roughly in dependency order
6. **Main orchestrator** — `main.ts` wiring all components together and implementing the action functions
7. **Bug fixes** — two passes of cleanup: TypeScript strict-mode unused-variable errors, then an SVG bar animation bug (switched from attribute-based to `scaleY()`) and an edge-opacity restoration bug in `StateGraph.clearContributions()` (fixed by storing original opacity as a data attribute)
8. **Final typecheck** — `tsc --noEmit` with zero errors before sign-off

Total: approximately 1,100 lines of TypeScript across 14 files (not counting CSS and HTML).

---

### Known Limitations

- The number of states is fixed by the preset; adding or removing states requires editing `presets.ts` and restarting the dev server (no dynamic state-count UI)
- The simulation is the pure time-update step only — no observation model, no evidence, no HMM filtering. This is by design for the "Mini" scope
- The app is not mobile-optimized; it assumes a wide desktop viewport
- History is stored in memory and is not persisted across page reloads
