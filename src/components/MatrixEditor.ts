import type { MarkovModel } from '../types';
import { STATE_COLORS } from '../presets';

export class MatrixEditor {
  private container: HTMLElement;

  onTransitionChange: ((T: number[][]) => void) | null = null;
  onInitialBeliefChange: ((b: number[]) => void) | null = null;

  private T: number[][] = [];
  private belief: number[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
  }

  build(model: MarkovModel): void {
    this.T = model.transition.map(row => [...row]);
    this.belief = [...model.initialBelief];
    this.render(model.states);
  }

  private render(states: string[]): void {
    const n = states.length;
    this.container.innerHTML = '';

    const layout = document.createElement('div');
    layout.className = 'matrix-layout';
    this.container.appendChild(layout);

    // ── Transition matrix ──
    const matrixSection = document.createElement('div');
    matrixSection.className = 'matrix-section';
    layout.appendChild(matrixSection);

    const matH3 = document.createElement('h3');
    matH3.textContent = `Transition Matrix  T[from → to]`;
    matrixSection.appendChild(matH3);

    const table = document.createElement('table');
    table.className = 'matrix-table';
    matrixSection.appendChild(table);

    // Header row: "from↓  to→" then state names, then "sum"
    const thead = document.createElement('thead');
    table.appendChild(thead);
    const hrow = document.createElement('tr');
    thead.appendChild(hrow);

    const cornerTh = document.createElement('th');
    cornerTh.innerHTML = '<span style="color:var(--text-dim);font-size:10px">from↓ &nbsp; to→</span>';
    hrow.appendChild(cornerTh);

    states.forEach((s, j) => {
      const th = document.createElement('th');
      th.className = 'col-header';
      th.style.color = STATE_COLORS[j % STATE_COLORS.length];
      th.textContent = s;
      hrow.appendChild(th);
    });

    const sumTh = document.createElement('th');
    sumTh.innerHTML = '<span style="color:var(--text-dim);font-size:10px">sum</span>';
    hrow.appendChild(sumTh);

    // Body rows
    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    for (let i = 0; i < n; i++) {
      const tr = document.createElement('tr');
      tbody.appendChild(tr);

      const rowHeaderTd = document.createElement('td');
      rowHeaderTd.style.cssText = 'padding: 2px 10px 2px 4px; font-weight:700; font-size:12px;';
      rowHeaderTd.style.color = STATE_COLORS[i % STATE_COLORS.length];
      rowHeaderTd.textContent = states[i];
      tr.appendChild(rowHeaderTd);

      for (let j = 0; j < n; j++) {
        const td = document.createElement('td');
        tr.appendChild(td);

        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'matrix-input';
        input.min = '0';
        input.max = '1';
        input.step = '0.05';
        input.value = this.T[i][j].toFixed(2);
        input.dataset['row'] = String(i);
        input.dataset['col'] = String(j);
        td.appendChild(input);

        input.addEventListener('input', () => {
          const v = parseFloat(input.value);
          if (!isNaN(v)) {
            this.T[i][j] = Math.max(0, Math.min(1, v));
            this.updateRowSumCell(i);
            this.onTransitionChange?.(this.T.map(r => [...r]));
          }
        });

        input.addEventListener('blur', () => {
          this.normalizeRow(i, n);
          this.refreshRowInputs(i, tbody);
          this.updateRowSumCell(i);
          this.onTransitionChange?.(this.T.map(r => [...r]));
        });
      }

      // Row sum cell
      const sumTd = document.createElement('td');
      sumTd.className = 'row-sum-cell';
      sumTd.id = `row-sum-${i}`;
      tr.appendChild(sumTd);
      this.updateRowSumCell(i);
    }

    // ── Initial belief ──
    const beliefSection = document.createElement('div');
    beliefSection.className = 'matrix-section';
    layout.appendChild(beliefSection);

    const belH3 = document.createElement('h3');
    belH3.textContent = 'Initial Belief  B₀';
    beliefSection.appendChild(belH3);

    const beliefDiv = document.createElement('div');
    beliefDiv.className = 'belief-editor';
    beliefSection.appendChild(beliefDiv);

    for (let i = 0; i < n; i++) {
      const row = document.createElement('div');
      row.className = 'belief-row';
      beliefDiv.appendChild(row);

      const nameSpan = document.createElement('span');
      nameSpan.className = 'belief-state-name';
      nameSpan.style.color = STATE_COLORS[i % STATE_COLORS.length];
      nameSpan.textContent = states[i];
      row.appendChild(nameSpan);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'belief-slider';
      slider.min = '0';
      slider.max = '1';
      slider.step = '0.01';
      slider.value = String(this.belief[i]);
      slider.id = `belief-slider-${i}`;
      row.appendChild(slider);

      const valueInput = document.createElement('input');
      valueInput.type = 'number';
      valueInput.className = 'belief-value-input';
      valueInput.min = '0';
      valueInput.max = '1';
      valueInput.step = '0.01';
      valueInput.value = this.belief[i].toFixed(3);
      valueInput.id = `belief-val-${i}`;
      row.appendChild(valueInput);

      slider.addEventListener('input', () => {
        const v = parseFloat(slider.value);
        this.belief[i] = v;
        valueInput.value = v.toFixed(3);
        this.updateBeliefSum(beliefDiv);
      });

      slider.addEventListener('change', () => {
        this.onInitialBeliefChange?.(this.belief.map(x => x));
      });

      valueInput.addEventListener('blur', () => {
        const v = parseFloat(valueInput.value);
        if (!isNaN(v)) {
          this.belief[i] = Math.max(0, Math.min(1, v));
          slider.value = String(this.belief[i]);
          valueInput.value = this.belief[i].toFixed(3);
          this.updateBeliefSum(beliefDiv);
          this.onInitialBeliefChange?.(this.belief.map(x => x));
        }
      });
    }

    // Sum indicator + normalize
    const sumRow = document.createElement('div');
    sumRow.className = 'belief-sum-row';
    sumRow.id = 'belief-sum-row';
    beliefDiv.appendChild(sumRow);
    this.updateBeliefSum(beliefDiv);

    const normBtn = document.createElement('button');
    normBtn.className = 'btn normalize-btn';
    normBtn.textContent = 'Normalize';
    normBtn.addEventListener('click', () => {
      this.normalizeBelief(n);
      this.refreshBeliefInputs(n, beliefDiv);
      this.onInitialBeliefChange?.(this.belief.map(x => x));
    });
    sumRow.appendChild(normBtn);
  }

  private updateRowSumCell(row: number): void {
    const cell = document.getElementById(`row-sum-${row}`);
    if (!cell) return;
    const sum = this.T[row].reduce((a, b) => a + b, 0);
    const ok = Math.abs(sum - 1) < 0.001;
    cell.className = `row-sum-cell ${ok ? 'row-sum-ok' : 'row-sum-bad'}`;
    cell.textContent = sum.toFixed(3);
  }

  private normalizeRow(i: number, n: number): void {
    const sum = this.T[i].reduce((a, b) => a + b, 0);
    if (sum < 0.0001) {
      this.T[i] = new Array(n).fill(1 / n) as number[];
    } else {
      this.T[i] = this.T[i].map(v => v / sum);
    }
  }

  private refreshRowInputs(i: number, tbody: HTMLTableSectionElement): void {
    const row = tbody.rows[i];
    if (!row) return;
    // Skip the first td (state name)
    for (let j = 0; j < this.T[i].length; j++) {
      const input = row.cells[j + 1]?.querySelector('input') as HTMLInputElement | null;
      if (input) input.value = this.T[i][j].toFixed(2);
    }
  }

  private updateBeliefSum(beliefDiv: HTMLElement): void {
    const sumRow = beliefDiv.querySelector('#belief-sum-row');
    if (!sumRow) return;
    const sum = this.belief.reduce((a, b) => a + b, 0);
    const ok = Math.abs(sum - 1) < 0.001;
    // Remove all except the last button
    const btn = sumRow.querySelector('button');
    sumRow.innerHTML = '';
    const label = document.createElement('span');
    label.style.color = 'var(--text-dim)';
    label.textContent = 'Sum: ';
    sumRow.appendChild(label);
    const val = document.createElement('span');
    val.className = `belief-sum-val ${ok ? 'belief-sum-ok' : 'belief-sum-bad'}`;
    val.textContent = sum.toFixed(3);
    sumRow.appendChild(val);
    if (btn) sumRow.appendChild(btn);
  }

  private normalizeBelief(n: number): void {
    const sum = this.belief.reduce((a, b) => a + b, 0);
    if (sum < 0.0001) {
      this.belief = new Array(n).fill(1 / n) as number[];
    } else {
      this.belief = this.belief.map(v => v / sum);
    }
  }

  private refreshBeliefInputs(n: number, beliefDiv: HTMLElement): void {
    for (let i = 0; i < n; i++) {
      const slider = beliefDiv.querySelector(`#belief-slider-${i}`) as HTMLInputElement | null;
      const val = beliefDiv.querySelector(`#belief-val-${i}`) as HTMLInputElement | null;
      if (slider) slider.value = String(this.belief[i]);
      if (val) val.value = this.belief[i].toFixed(3);
    }
    this.updateBeliefSum(beliefDiv);
  }
}
