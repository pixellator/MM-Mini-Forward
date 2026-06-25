import type { MarkovModel } from '../types';
import { STATE_COLORS } from '../presets';

export class MathStep {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.showPlaceholder();
  }

  showPlaceholder(): void {
    this.container.innerHTML =
      `<div class="math-placeholder">Press <b>Step Forward</b> to propagate the belief distribution.</div>`;
  }

  update(model: MarkovModel, prevBelief: number[], newBelief: number[], contributions: number[][]): void {
    const n = model.states.length;
    const rows: string[] = [];

    rows.push(`<div class="math-intro">Computed at this step — each new belief is a weighted sum over all source states:</div>`);
    rows.push(`<div class="math-grid">`);

    for (let j = 0; j < n; j++) {
      const destColor = STATE_COLORS[j % STATE_COLORS.length];
      const destName = model.states[j];

      // Build the formula line
      const terms = model.states.map((_srcName, i) => {
        const srcColor = STATE_COLORS[i % STATE_COLORS.length];
        const p = model.transition[i][j];
        const b = prevBelief[i];
        return (
          `<span class="math-term">` +
          `<span class="math-prob" style="color:${srcColor}90">${p.toFixed(2)}</span>` +
          `<span class="math-op"> &times; </span>` +
          `<span class="math-belief" style="color:${srcColor}">${b.toFixed(3)}</span>` +
          `</span>`
        );
      }).join(`<span class="math-sum-sep"> + </span>`);

      const products = model.states.map((_, i) => {
        const prod = contributions[i][j];
        return `<span class="math-product">${prod.toFixed(4)}</span>`;
      }).join(`<span class="math-sum-sep"> + </span>`);

      rows.push(`<div class="math-row">`);
      rows.push(
        `<span class="math-lhs" style="color:${destColor}">B'(${destName})</span>` +
        `<span class="math-rhs">` +
        `<span class="math-equals"> = </span>` +
        terms +
        `<span class="math-equals"> = </span>` +
        products +
        `<span class="math-equals"> = </span>` +
        `<span class="math-result" style="color:${destColor}">${newBelief[j].toFixed(4)}</span>` +
        `</span>`
      );
      rows.push(`</div>`);
    }

    rows.push(`</div>`);
    this.container.innerHTML = rows.join('');
  }
}
