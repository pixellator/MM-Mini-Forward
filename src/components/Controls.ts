import type { AppState } from '../types';
import { PRESETS } from '../presets';

export class Controls {
  private container: HTMLElement;

  onPresetChange: ((idx: number) => void) | null = null;
  onStepForward: (() => void) | null = null;
  onStepBack: (() => void) | null = null;
  onReset: (() => void) | null = null;
  onPlay: (() => void) | null = null;
  onPause: (() => void) | null = null;
  onSpeedChange: ((speed: number) => void) | null = null;

  private playBtn!: HTMLButtonElement;
  private stepFwdBtn!: HTMLButtonElement;
  private stepBackBtn!: HTMLButtonElement;
  private resetBtn!: HTMLButtonElement;
  private presetSelect!: HTMLSelectElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.build();
  }

  private build(): void {
    const div = document.createElement('div');
    div.className = 'controls';

    // Preset selector
    this.presetSelect = document.createElement('select');
    PRESETS.forEach((p, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = p.name;
      this.presetSelect.appendChild(opt);
    });
    this.presetSelect.addEventListener('change', () => {
      this.onPresetChange?.(parseInt(this.presetSelect.value));
    });
    div.appendChild(this.presetSelect);

    const sep1 = document.createElement('div');
    sep1.className = 'controls-sep';
    div.appendChild(sep1);

    // Step back
    this.stepBackBtn = document.createElement('button');
    this.stepBackBtn.className = 'btn';
    this.stepBackBtn.innerHTML = '&#8592; Back';
    this.stepBackBtn.title = 'Step back one time step';
    this.stepBackBtn.addEventListener('click', () => this.onStepBack?.());
    div.appendChild(this.stepBackBtn);

    // Play/Pause
    this.playBtn = document.createElement('button');
    this.playBtn.className = 'btn btn-primary';
    this.playBtn.innerHTML = '&#9654; Play';
    this.playBtn.title = 'Auto-advance steps';
    this.playBtn.addEventListener('click', () => {
      if (this.playBtn.dataset['playing'] === 'true') {
        this.onPause?.();
      } else {
        this.onPlay?.();
      }
    });
    div.appendChild(this.playBtn);

    // Step forward
    this.stepFwdBtn = document.createElement('button');
    this.stepFwdBtn.className = 'btn';
    this.stepFwdBtn.innerHTML = 'Step &#8594;';
    this.stepFwdBtn.title = 'Step forward one time step';
    this.stepFwdBtn.addEventListener('click', () => this.onStepForward?.());
    div.appendChild(this.stepFwdBtn);

    // Reset
    this.resetBtn = document.createElement('button');
    this.resetBtn.className = 'btn';
    this.resetBtn.innerHTML = '&#8635; Reset';
    this.resetBtn.title = 'Return to t = 0';
    this.resetBtn.addEventListener('click', () => this.onReset?.());
    div.appendChild(this.resetBtn);

    const sep2 = document.createElement('div');
    sep2.className = 'controls-sep';
    div.appendChild(sep2);

    // Speed
    const speedLabel = document.createElement('label');
    speedLabel.className = 'speed-label';
    speedLabel.textContent = 'Speed:';
    const speedInput = document.createElement('input');
    speedInput.type = 'range';
    speedInput.min = '0.5';
    speedInput.max = '4';
    speedInput.step = '0.5';
    speedInput.value = '1';
    speedInput.addEventListener('input', () => {
      this.onSpeedChange?.(parseFloat(speedInput.value));
    });
    speedLabel.appendChild(speedInput);
    const speedVal = document.createElement('span');
    speedVal.id = 'speed-val';
    speedVal.textContent = '1×';
    speedInput.addEventListener('input', () => {
      speedVal.textContent = `${speedInput.value}×`;
    });
    speedLabel.appendChild(speedVal);
    div.appendChild(speedLabel);

    this.container.appendChild(div);
  }

  update(state: AppState): void {
    const animating = state.animating;
    this.stepFwdBtn.disabled = animating;
    this.stepBackBtn.disabled = animating || state.currentStep === 0;
    this.resetBtn.disabled = animating || state.currentStep === 0;
    this.presetSelect.disabled = animating;

    if (state.isPlaying) {
      this.playBtn.innerHTML = '&#9646;&#9646; Pause';
      this.playBtn.dataset['playing'] = 'true';
    } else {
      this.playBtn.innerHTML = '&#9654; Play';
      this.playBtn.dataset['playing'] = 'false';
    }
    this.playBtn.disabled = animating && !state.isPlaying;
  }
}
