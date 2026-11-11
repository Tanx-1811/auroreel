/** Tiny DOM builders for the on-page UI (no innerHTML: some sites enforce Trusted Types). */

type Attrs = Record<string, string | number | boolean | undefined>;

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: (Node | string | null | undefined)[]
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === false) continue;
    if (k === 'class') node.className = String(v);
    else if (k === 'text') node.textContent = String(v);
    else node.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of children) if (c != null) node.append(c);
  return node;
}

const NS = 'http://www.w3.org/2000/svg';

/** Icon spec: lucide-style 24×24 outline drawing as [tag, attributes] pairs. */
export type IconSpec = [string, Record<string, string | number>][];

export function icon(spec: IconSpec, size = 18): SVGSVGElement {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const [tag, attrs] of spec) {
    const child = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) child.setAttribute(k, String(v));
    svg.append(child);
  }
  return svg;
}

const p = (d: string): [string, Record<string, string>] => ['path', { d }];
const circle = (cx: number, cy: number, r: number): [string, Record<string, number>] => ['circle', { cx, cy, r }];
const rect = (x: number, y: number, w: number, h: number, rx: number): [string, Record<string, number>] => [
  'rect',
  { x, y, width: w, height: h, rx },
];

export const ICONS = {
  minus: [p('M5 12h14')],
  plus: [p('M5 12h14'), p('M12 5v14')],
  filters: [
    p('M3 6h10'),
    p('M17 6h4'),
    p('M3 12h4'),
    p('M11 12h10'),
    p('M3 18h12'),
    p('M19 18h2'),
    circle(15, 6, 2),
    circle(9, 12, 2),
    circle(17, 18, 2),
  ],
  ambient: [
    circle(12, 12, 4),
    p('M12 2v2'),
    p('M12 20v2'),
    p('m4.93 4.93 1.41 1.41'),
    p('m17.66 17.66 1.41 1.41'),
    p('M2 12h2'),
    p('M20 12h2'),
    p('m6.34 17.66-1.41 1.41'),
    p('m19.07 4.93-1.41 1.41'),
  ],
  cinema: [p('M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z')],
  camera: [
    p('M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z'),
    circle(12, 13, 3),
  ],
  pip: [rect(2, 4, 20, 16, 2), rect(12, 11, 7, 6, 1)],
  loop: [p('m17 2 4 4-4 4'), p('M3 11v-1a4 4 0 0 1 4-4h14'), p('m7 22-4-4 4-4'), p('M21 13v1a4 4 0 0 1-4 4H3')],
  reset: [p('M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8'), p('M3 3v5h5')],
  close: [p('M18 6 6 18'), p('m6 6 12 12')],
} satisfies Record<string, IconSpec>;
