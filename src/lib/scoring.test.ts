import { describe, expect, it } from 'vitest';
import { lookupIngredient, scoreIngredientList } from './scoring';

describe('lookupIngredient', () => {
  it('returns correct score for glycerin', () => {
    const result = lookupIngredient('glycerin');
    expect(result).not.toBeNull();
    expect(result?.name).toBe('GLYCERIN');
    expect(result?.safety).toBe(1);
    expect(result?.comedogenic).toBe(0);
    expect(result?.irritation).toBe(0);
    expect(result?.category).toBe('humectant');
  });

  it('is case-insensitive', () => {
    const lower = lookupIngredient('glycerin');
    const upper = lookupIngredient('GLYCERIN');
    const mixed = lookupIngredient('Glycerin');

    expect(lower).toEqual(upper);
    expect(upper).toEqual(mixed);
  });

  it('resolves aliases (hyaluronic acid → SODIUM HYALURONATE)', () => {
    const result = lookupIngredient('hyaluronic acid');
    expect(result).not.toBeNull();
    expect(result?.name).toBe('SODIUM HYALURONATE');
    expect(result?.safety).toBe(1);
    expect(result?.comedogenic).toBe(0);
  });

  it('returns null for nonexistent ingredient', () => {
    const result = lookupIngredient('nonexistent-xyz');
    expect(result).toBeNull();
  });

  it('trims whitespace from input', () => {
    const result = lookupIngredient('  glycerin  ');
    expect(result).not.toBeNull();
    expect(result?.name).toBe('GLYCERIN');
  });
});

describe('scoreIngredientList', () => {
  it('returns correct overall, flagged, and unknown for safe ingredients', () => {
    const result = scoreIngredientList(['glycerin', 'coconut oil']);
    expect(result.scores.length).toBe(2);
    // glycerin: safety=1, comedogenic=0 → no penalty
    // coconut oil: safety=2, comedogenic=4 → flagged (comedogenic>=3), penalty=3
    expect(result.overall).toBe(97);
    expect(result.flagged).toContain('COCOS NUCIFERA OIL');
    expect(result.unknown).toEqual([]);
  });

  it('deducts correctly for highly comedogenic ingredients', () => {
    // coconut oil: comedogenic=4, safety=2 → penalty=3
    // isopropyl myristate: comedogenic=5, safety=3 → penalty=3
    const result = scoreIngredientList(['coconut oil', 'isopropyl myristate']);
    expect(result.overall).toBeLessThan(100);
    // Total penalty: 3 + 3 = 6 → overall = 94
    expect(result.overall).toBe(94);
    expect(result.flagged).toContain('COCOS NUCIFERA OIL');
    expect(result.flagged).toContain('ISOPROPYL MYRISTATE');
  });

  it('returns overall 100 and empty arrays for empty input', () => {
    const result = scoreIngredientList([]);
    expect(result.overall).toBe(100);
    expect(result.scores).toEqual([]);
    expect(result.flagged).toEqual([]);
    expect(result.unknown).toEqual([]);
  });

  it('puts unrecognized ingredients in unknown array', () => {
    const result = scoreIngredientList(['randomfakeingredient']);
    expect(result.unknown).toContain('randomfakeingredient');
    expect(result.scores).toEqual([]);
    expect(result.overall).toBe(100); // no penalty for unknown
  });

  it('handles mixed known and unknown ingredients', () => {
    const result = scoreIngredientList(['glycerin', 'unknownthing', 'niacinamide']);
    expect(result.scores.length).toBe(2);
    expect(result.unknown).toContain('unknownthing');
    expect(result.overall).toBe(100); // both known ingredients are safe
  });
});
