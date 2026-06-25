import type { MarkovModel } from '../types';
import { STATE_COLORS } from '../presets';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SVG_W = 500;
const SVG_H = 460;
const CX = 250;
const CY = 230;
const LAYOUT_R = 105;
const NODE_R = 30;
const ARC_R = 19;
const ARC_W = 9;
const ARC_CIRC = 2 * Math.PI * ARC_R;
const CURVE = 40;
const SELF_SPREAD = 0.45;
const SELF_DIST = 58;

function svgEl<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS(SVG_NS, tag);
}

function nodePos(i: number, n: number): [number, number] {
  const angle = -Math.PI / 2 + (2 * Math.PI * i / n);
  return [CX + LAYOUT_R * Math.cos(angle), CY + LAYOUT_R * Math.sin(angle)];
}

function outAngle(i: number, n: number): number {
  return -Math.PI / 2 + (2 * Math.PI * i / n);
}

interface EdgeGeometry {
  path: string;
  labelX: number;
  labelY: number;
}

function edgeGeometry(from: number, to: number, n: number): EdgeGeometry {
  if (from === to) return selfLoopGeometry(from, n);

  const [sx, sy] = nodePos(from, n);
  const [dx, dy] = nodePos(to, n);
  const mx = (sx + dx) / 2;
  const my = (sy + dy) / 2;

  const len = Math.hypot(dx - sx, dy - sy);
  const perpX = -(dy - sy) / len;
  const perpY = (dx - sx) / len;

  const cqx = mx + perpX * CURVE;
  const cqy = my + perpY * CURVE;

  // Start on from-node circumference in direction toward control point
  const sdLen = Math.hypot(cqx - sx, cqy - sy);
  const startX = sx + ((cqx - sx) / sdLen) * NODE_R;
  const startY = sy + ((cqy - sy) / sdLen) * NODE_R;

  // End on to-node circumference from control point direction
  const edLen = Math.hypot(dx - cqx, dy - cqy);
  const endX = dx - ((dx - cqx) / edLen) * (NODE_R + 7);
  const endY = dy - ((dy - cqy) / edLen) * (NODE_R + 7);

  // Label at bezier midpoint + perpendicular offset
  const lx = 0.25 * startX + 0.5 * cqx + 0.25 * endX + perpX * 13;
  const ly = 0.25 * startY + 0.5 * cqy + 0.25 * endY + perpY * 13;

  return { path: `M ${startX} ${startY} Q ${cqx} ${cqy} ${endX} ${endY}`, labelX: lx, labelY: ly };
}

function selfLoopGeometry(i: number, n: number): EdgeGeometry {
  const [nx, ny] = nodePos(i, n);
  const oa = outAngle(i, n);

  const a1 = oa - SELF_SPREAD;
  const a2 = oa + SELF_SPREAD;
  const s1x = nx + Math.cos(a1) * NODE_R;
  const s1y = ny + Math.sin(a1) * NODE_R;
  const s2x = nx + Math.cos(a2) * NODE_R;
  const s2y = ny + Math.sin(a2) * NODE_R;

  const c1x = nx + Math.cos(oa - SELF_SPREAD * 0.25) * (NODE_R + SELF_DIST);
  const c1y = ny + Math.sin(oa - SELF_SPREAD * 0.25) * (NODE_R + SELF_DIST);
  const c2x = nx + Math.cos(oa + SELF_SPREAD * 0.25) * (NODE_R + SELF_DIST);
  const c2y = ny + Math.sin(oa + SELF_SPREAD * 0.25) * (NODE_R + SELF_DIST);

  // End 7px before s2 for arrowhead
  const d = Math.hypot(s2x - c2x, s2y - c2y);
  const endX = s2x - ((s2x - c2x) / d) * 7;
  const endY = s2y - ((s2y - c2y) / d) * 7;

  const labelX = nx + Math.cos(oa) * (NODE_R + SELF_DIST * 0.65) + 3;
  const labelY = ny + Math.sin(oa) * (NODE_R + SELF_DIST * 0.65);

  return { path: `M ${s1x} ${s1y} C ${c1x} ${c1y} ${c2x} ${c2y} ${endX} ${endY}`, labelX, labelY };
}

export class StateGraph {
  private container: HTMLElement;
  // Stable element references for updating without full re-render
  private beliefArcs: Map<number, SVGCircleElement> = new Map();
  private beliefPctLabels: Map<number, SVGTextElement> = new Map();
  private edgeHighlights: Map<string, SVGPathElement> = new Map();
  private edgeNormals: Map<string, SVGPathElement> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
  }

  buildModel(model: MarkovModel): void {
    this.container.innerHTML = '';
    this.beliefArcs.clear();
    this.beliefPctLabels.clear();
    this.edgeHighlights.clear();
    this.edgeNormals.clear();

    const svg = svgEl('svg');
    svg.setAttribute('viewBox', `0 0 ${SVG_W} ${SVG_H}`);
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.container.appendChild(svg);

    const defs = svgEl('defs');
    svg.appendChild(defs);

    // Arrow markers: one per state color + one gray
    const grayMarker = this.makeMarker('arrow-gray', '#778899');
    defs.appendChild(grayMarker);
    model.states.forEach((_, i) => {
      defs.appendChild(this.makeMarker(`arrow-${i}`, STATE_COLORS[i % STATE_COLORS.length]));
    });

    const n = model.states.length;
    const edgeGroup = svgEl('g');
    edgeGroup.setAttribute('class', 'edges');
    svg.appendChild(edgeGroup);

    // Draw edges
    for (let from = 0; from < n; from++) {
      for (let to = 0; to < n; to++) {
        const geo = edgeGeometry(from, to, n);
        const key = `${from}-${to}`;
        const color = STATE_COLORS[from % STATE_COLORS.length];

        // Normal (thin, semi-transparent)
        const normalOpacity = 0.35 + model.transition[from][to] * 0.4;
        const normal = svgEl('path');
        normal.setAttribute('class', 'edge-path edge-normal');
        normal.setAttribute('d', geo.path);
        normal.setAttribute('stroke', '#6070a0');
        normal.setAttribute('stroke-width', String(1 + model.transition[from][to] * 2));
        normal.setAttribute('stroke-opacity', String(normalOpacity));
        normal.setAttribute('data-opacity', String(normalOpacity));
        normal.setAttribute('marker-end', 'url(#arrow-gray)');
        edgeGroup.appendChild(normal);
        this.edgeNormals.set(key, normal);

        // Highlight (hidden until animation)
        const highlight = svgEl('path');
        highlight.setAttribute('class', 'edge-path edge-highlight');
        highlight.setAttribute('d', geo.path);
        highlight.setAttribute('stroke', color);
        highlight.setAttribute('stroke-width', '0');
        highlight.setAttribute('stroke-opacity', '0');
        highlight.setAttribute('marker-end', `url(#arrow-${from})`);
        edgeGroup.appendChild(highlight);
        this.edgeHighlights.set(key, highlight);

        // Edge label
        const label = svgEl('text');
        label.setAttribute('class', 'edge-label');
        label.setAttribute('x', String(geo.labelX));
        label.setAttribute('y', String(geo.labelY));
        label.textContent = model.transition[from][to].toFixed(2);
        edgeGroup.appendChild(label);
      }
    }

    // Draw nodes on top
    const nodeGroup = svgEl('g');
    nodeGroup.setAttribute('class', 'nodes');
    svg.appendChild(nodeGroup);

    for (let i = 0; i < n; i++) {
      const [nx, ny] = nodePos(i, n);
      const color = STATE_COLORS[i % STATE_COLORS.length];

      const g = svgEl('g');
      g.setAttribute('transform', `translate(${nx}, ${ny})`);

      // Shadow / glow background
      const glow = svgEl('circle');
      glow.setAttribute('r', String(NODE_R + 4));
      glow.setAttribute('fill', color);
      glow.setAttribute('fill-opacity', '0.08');
      g.appendChild(glow);

      // Main circle
      const circle = svgEl('circle');
      circle.setAttribute('r', String(NODE_R));
      circle.setAttribute('fill', '#111228');
      circle.setAttribute('stroke', color);
      circle.setAttribute('stroke-width', '2.5');
      g.appendChild(circle);

      // Belief arc background ring
      const arcBg = svgEl('circle');
      arcBg.setAttribute('class', 'belief-arc-bg');
      arcBg.setAttribute('r', String(ARC_R));
      arcBg.setAttribute('stroke', color);
      arcBg.setAttribute('stroke-width', String(ARC_W));
      g.appendChild(arcBg);

      // Belief arc (animated)
      const arc = svgEl('circle');
      arc.setAttribute('class', 'belief-arc');
      arc.setAttribute('r', String(ARC_R));
      arc.setAttribute('stroke', color);
      arc.setAttribute('stroke-width', String(ARC_W));
      arc.setAttribute('transform', 'rotate(-90)');
      arc.style.setProperty('stroke-dasharray', `0 ${ARC_CIRC}`);
      g.appendChild(arc);
      this.beliefArcs.set(i, arc);

      // State name
      const nameText = svgEl('text');
      nameText.setAttribute('class', 'node-name');
      nameText.setAttribute('y', '-6');
      nameText.setAttribute('fill', color);
      nameText.textContent = model.states[i];
      g.appendChild(nameText);

      // Belief percentage
      const pctText = svgEl('text');
      pctText.setAttribute('class', 'node-belief-pct');
      pctText.setAttribute('y', '10');
      pctText.textContent = '—';
      g.appendChild(pctText);
      this.beliefPctLabels.set(i, pctText);

      nodeGroup.appendChild(g);
    }
  }

  updateBelief(belief: number[]): void {
    belief.forEach((b, i) => {
      const arc = this.beliefArcs.get(i);
      if (arc) {
        const dash = b * ARC_CIRC;
        arc.style.setProperty('stroke-dasharray', `${dash} ${ARC_CIRC}`);
      }
      const pct = this.beliefPctLabels.get(i);
      if (pct) pct.textContent = `${(b * 100).toFixed(1)}%`;
    });
  }

  showContributions(contributions: number[][], n: number): void {
    const flat = contributions.flat();
    const maxC = Math.max(...flat, 0.001);

    for (let from = 0; from < n; from++) {
      for (let to = 0; to < n; to++) {
        const key = `${from}-${to}`;
        const c = contributions[from][to];
        const norm = c / maxC;

        const highlight = this.edgeHighlights.get(key);
        if (highlight) {
          highlight.setAttribute('stroke-width', String(1.5 + norm * 10));
          highlight.setAttribute('stroke-opacity', String(0.3 + norm * 0.7));
        }

        const normal = this.edgeNormals.get(key);
        if (normal) {
          normal.setAttribute('stroke-opacity', '0.12');
        }
      }
    }
  }

  clearContributions(): void {
    this.edgeHighlights.forEach(el => {
      el.setAttribute('stroke-width', '0');
      el.setAttribute('stroke-opacity', '0');
    });
    this.edgeNormals.forEach(el => {
      const orig = el.getAttribute('data-opacity') ?? '0.5';
      el.setAttribute('stroke-opacity', orig);
    });
  }

  private makeMarker(id: string, color: string): SVGMarkerElement {
    const marker = svgEl('marker');
    marker.setAttribute('id', id);
    marker.setAttribute('markerWidth', '8');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('refX', '7');
    marker.setAttribute('refY', '3');
    marker.setAttribute('orient', 'auto');

    const poly = svgEl('polygon');
    poly.setAttribute('points', '0 0, 8 3, 0 6');
    poly.setAttribute('fill', color);
    marker.appendChild(poly);
    return marker;
  }
}
