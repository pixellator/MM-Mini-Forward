import type { MarkovModel } from '../types';
import { STATE_COLORS } from '../presets';

const SVG_NS = 'http://www.w3.org/2000/svg';
const PAD_L = 44;
const PAD_R = 16;
const PAD_T = 16;
const PAD_B = 44;

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}

export class BeliefBars {
  private container: HTMLElement;
  // bar rects keyed by state index; each uses scaleY transform
  private barRects: Map<number, SVGRectElement> = new Map();
  private barLabels: Map<number, SVGTextElement> = new Map();
  private chartH = 0;
  private chartW = 0;
  private baseline = 0;  // y-coordinate of the chart baseline in SVG space
  private stateStep = 0;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  buildModel(model: MarkovModel): void {
    this.container.innerHTML = '';
    this.barRects.clear();
    this.barLabels.clear();

    const totalW = 600;
    const totalH = 260;
    this.chartW = totalW - PAD_L - PAD_R;
    this.chartH = totalH - PAD_T - PAD_B;
    this.baseline = PAD_T + this.chartH;

    const n = model.states.length;
    this.stateStep = this.chartW / n;
    const barW = Math.min(80, this.stateStep * 0.6);

    const svg = svgEl('svg');
    svg.setAttribute('viewBox', `0 0 ${totalW} ${totalH}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.container.appendChild(svg);

    // Grid lines + axis labels
    [0, 0.25, 0.5, 0.75, 1].forEach(v => {
      const y = this.baseline - v * this.chartH;

      const grid = svgEl('line');
      grid.setAttribute('class', 'bar-gridline');
      grid.setAttribute('x1', String(PAD_L));
      grid.setAttribute('x2', String(PAD_L + this.chartW));
      grid.setAttribute('y1', String(y));
      grid.setAttribute('y2', String(y));
      svg.appendChild(grid);

      const axLabel = svgEl('text');
      axLabel.setAttribute('class', 'bar-axis-label');
      axLabel.setAttribute('x', String(PAD_L - 6));
      axLabel.setAttribute('y', String(y));
      axLabel.textContent = v.toFixed(2);
      svg.appendChild(axLabel);
    });

    // Axis baseline
    const axis = svgEl('line');
    axis.setAttribute('class', 'bar-axis-line');
    axis.setAttribute('x1', String(PAD_L));
    axis.setAttribute('x2', String(PAD_L + this.chartW));
    axis.setAttribute('y1', String(this.baseline));
    axis.setAttribute('y2', String(this.baseline));
    svg.appendChild(axis);

    model.states.forEach((state, i) => {
      const cx = PAD_L + this.stateStep * i + this.stateStep / 2;
      const color = STATE_COLORS[i % STATE_COLORS.length];

      // Bar background (full chart height)
      const bg = svgEl('rect');
      bg.setAttribute('x', String(cx - barW / 2));
      bg.setAttribute('y', String(PAD_T));
      bg.setAttribute('width', String(barW));
      bg.setAttribute('height', String(this.chartH));
      bg.setAttribute('rx', '4');
      bg.setAttribute('fill', 'rgba(255,255,255,0.04)');
      svg.appendChild(bg);

      // Filled bar — rect spans full chart height, pinned at baseline.
      // We animate via transform: scaleY(belief), transform-origin: bottom of rect.
      // The group is translated to baseline; the rect goes upward (y = -chartH).
      const g = svgEl('g');
      g.setAttribute('transform', `translate(${cx}, ${this.baseline})`);
      svg.appendChild(g);

      const rect = svgEl('rect');
      rect.setAttribute('x', String(-barW / 2));
      rect.setAttribute('y', String(-this.chartH));
      rect.setAttribute('width', String(barW));
      rect.setAttribute('height', String(this.chartH));
      rect.setAttribute('rx', '4');
      rect.setAttribute('fill', color);
      rect.setAttribute('class', 'bar-fill');
      // Start at scaleY(0); transitions to scaleY(belief)
      rect.style.transform = 'scaleY(0)';
      g.appendChild(rect);
      this.barRects.set(i, rect);

      // Value label (above bar)
      const valLabel = svgEl('text');
      valLabel.setAttribute('class', 'bar-label');
      valLabel.setAttribute('x', String(cx));
      valLabel.setAttribute('y', String(this.baseline - 6));
      valLabel.setAttribute('fill', color);
      valLabel.textContent = '0.000';
      svg.appendChild(valLabel);
      this.barLabels.set(i, valLabel);

      // State name label (below axis)
      const stateLabel = svgEl('text');
      stateLabel.setAttribute('class', 'bar-state-label');
      stateLabel.setAttribute('x', String(cx));
      stateLabel.setAttribute('y', String(this.baseline + 18));
      stateLabel.setAttribute('fill', color);
      stateLabel.textContent = state;
      svg.appendChild(stateLabel);
    });
  }

  updateBelief(belief: number[]): void {
    belief.forEach((b, i) => {
      const rect = this.barRects.get(i);
      if (rect) {
        rect.style.transform = `scaleY(${b})`;
      }

      const lbl = this.barLabels.get(i);
      if (lbl) {
        const labelY = Math.max(PAD_T + 14, this.baseline - b * this.chartH - 6);
        lbl.setAttribute('y', String(labelY));
        lbl.textContent = b.toFixed(3);
      }
    });
  }
}
