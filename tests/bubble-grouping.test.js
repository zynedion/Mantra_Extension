import { describe, it, expect } from 'vitest';
import { refineRegions, sortReadingOrder } from '../src/modules/bubble-grouping.js';

describe('Speech Bubble Grouping & Sorting', () => {
  it('refineRegions removes small noise regions', () => {
    const mockRegions = [
      { bounds: { width: 5, height: 10 } }, // Noise
      { bounds: { width: 12, height: 15 } }  // Valid
    ];
    const result = refineRegions(mockRegions);
    expect(result.length).toBe(1);
  });

  it('sortReadingOrder sorts RTL for ja, LTR for others', () => {
    const leftRegion = { bounds: { x: 50, y: 100, width: 20, height: 20 } };
    const rightRegion = { bounds: { x: 150, y: 100, width: 20, height: 20 } };

    const jaSorted = sortReadingOrder([leftRegion, rightRegion], 'ja');
    expect(jaSorted[0]).toBe(rightRegion); // RTL: Right goes first

    const enSorted = sortReadingOrder([leftRegion, rightRegion], 'en');
    expect(enSorted[0]).toBe(leftRegion); // LTR: Left goes first
  });
});
