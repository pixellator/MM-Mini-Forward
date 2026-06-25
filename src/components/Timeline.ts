import type { AppState } from '../types';
import { STATE_COLORS } from '../presets';

export class Timeline {
  private container: HTMLElement;
  onStepSelect: ((t: number) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  update(state: AppState): void {
    this.container.innerHTML = '';

    if (state.history.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'timeline-empty';
      empty.textContent = 'No steps yet.';
      this.container.appendChild(empty);
      return;
    }

    const track = document.createElement('div');
    track.className = 'timeline-track';
    this.container.appendChild(track);

    state.history.forEach((belief, t) => {
      const step = document.createElement('div');
      step.className = 'timeline-step' + (t === state.currentStep ? ' current' : '');
      step.title = `Jump to t = ${t}`;
      step.addEventListener('click', () => this.onStepSelect?.(t));

      const miniBarContainer = document.createElement('div');
      miniBarContainer.className = 'timeline-mini-bars';

      belief.forEach((b, i) => {
        const bar = document.createElement('div');
        bar.className = 'timeline-mini-bar';
        bar.style.height = `${Math.max(2, b * 44)}px`;
        bar.style.background = STATE_COLORS[i % STATE_COLORS.length];
        miniBarContainer.appendChild(bar);
      });

      const label = document.createElement('div');
      label.className = 'timeline-step-label';
      label.textContent = `t = ${t}`;

      step.appendChild(miniBarContainer);
      step.appendChild(label);
      track.appendChild(step);
    });

    // Scroll to show the current step
    const currentEl = track.children[state.currentStep] as HTMLElement | undefined;
    if (currentEl) {
      currentEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }
}
