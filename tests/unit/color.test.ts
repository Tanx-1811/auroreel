import { describe, expect, it } from 'vitest';
import {
  contrast,
  ensureContrast,
  formatColor,
  fromOklch,
  hueDistance,
  mix,
  onColor,
  parseColor,
  rgbToOklab,
  oklabToRgb,
  toOklch,
} from '../../src/core/color';

describe('parseColor', () => {
  it('reads the formats sites put in custom properties', () => {
    expect(parseColor('#fff')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
    expect(parseColor('#0f0f0f')).toEqual({ r: 15, g: 15, b: 15, a: 1 });
    expect(parseColor('#00000080')?.a).toBeCloseTo(0.5, 2);
    expect(parseColor('rgba(255,255,255,0.1)')).toEqual({ r: 255, g: 255, b: 255, a: 0.1 });
    expect(parseColor('rgb(1 2 3 / 50%)')).toEqual({ r: 1, g: 2, b: 3, a: 0.5 });
    expect(parseColor('hsla(0,0%,53.3%,0.4)')?.a).toBeCloseTo(0.4);
    expect(parseColor('hsl(0, 0%, 18.82%)')?.r).toBeCloseTo(48, 0);
    expect(parseColor('transparent')).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(parseColor(' WHITE ')).toEqual({ r: 255, g: 255, b: 255, a: 1 });
  });

  it('rejects everything else', () => {
    for (const v of [
      '',
      'var(--x)',
      'initial',
      'color-mix(in oklab, red, blue)',
      '#ggg',
      '#12345',
      'rgb(1,2)',
      'linear-gradient(red, blue)',
    ]) {
      expect(parseColor(v)).toBeNull();
    }
  });
});

describe('formatColor', () => {
  it('prints hex when opaque and rgb() with alpha otherwise', () => {
    expect(formatColor({ r: 255, g: 0, b: 51, a: 1 })).toBe('#ff0033');
    expect(formatColor({ r: 255, g: 255, b: 255, a: 0.1 })).toBe('rgb(255 255 255 / 0.1)');
  });
});

describe('OKLab', () => {
  it('round-trips sRGB colours', () => {
    for (const hex of ['#ff0033', '#065fd4', '#0f0f0f', '#f1f1f1', '#8b5cf6']) {
      const c = parseColor(hex)!;
      expect(formatColor(oklabToRgb(rgbToOklab(c)))).toBe(hex);
    }
  });

  it('keeps out-of-gamut colours inside sRGB by lowering chroma', () => {
    const c = fromOklch({ L: 0.7, C: 0.5, H: 150, alpha: 1 });
    for (const ch of [c.r, c.g, c.b]) {
      expect(ch).toBeGreaterThanOrEqual(0);
      expect(ch).toBeLessThanOrEqual(255);
    }
    expect(toOklch(c).H).toBeCloseTo(150, -1);
  });

  it('mixes perceptually and measures hue distance across 0°', () => {
    const black = parseColor('#000')!;
    const white = parseColor('#fff')!;
    expect(rgbToOklab(mix(black, white, 0.5)).L).toBeCloseTo(0.5, 2);
    expect(hueDistance(350, 10)).toBe(20);
    expect(hueDistance(10, 200)).toBe(170);
  });
});

describe('contrast helpers', () => {
  it('computes WCAG contrast', () => {
    expect(contrast(parseColor('#000')!, parseColor('#fff')!)).toBeCloseTo(21, 0);
  });

  it('pushes text away from the background until it reads well', () => {
    const bg = parseColor('#101010')!;
    const fixed = ensureContrast(parseColor('#333333')!, bg, 7);
    expect(contrast(fixed, bg)).toBeGreaterThanOrEqual(7);
  });

  it('picks black or white text for a button', () => {
    expect(formatColor(onColor(parseColor('#fafafa')!))).toBe('#0f0f14');
    expect(formatColor(onColor(parseColor('#5b21b6')!))).toBe('#ffffff');
  });
});
