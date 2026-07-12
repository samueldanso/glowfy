import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/bedrock', () => ({
  invokeClaude: vi.fn(),
}));

import { Hono } from 'hono';
import { invokeClaude } from '../lib/bedrock';
import { ingredientRoutes } from './ingredients';

const mockInvoke = vi.mocked(invokeClaude);

const testApp = new Hono();
testApp.route('/ingredients', ingredientRoutes);

function post(path: string, body: unknown) {
  return testApp.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('/ingredients/check', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(
      'This product scores 97/100 for safety. Coconut oil is flagged as comedogenic.',
    );
  });

  it('POST with valid ingredients returns 200 with scores', async () => {
    const res = await post('/ingredients/check', {
      ingredients: ['glycerin', 'coconut oil'],
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.overall_score).toBeDefined();
    expect(data.total_ingredients).toBe(2);
    expect(data.ingredients).toHaveLength(2);
    expect(data.flagged).toContain('COCOS NUCIFERA OIL');
    expect(data.summary).toBeDefined();
  });

  it('POST with empty array returns 400', async () => {
    const res = await post('/ingredients/check', { ingredients: [] });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Missing or empty');
  });

  it('POST with no body returns 400', async () => {
    const res = await testApp.request('/ingredients/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Missing or empty');
  });

  it('POST with non-string items returns 400', async () => {
    const res = await post('/ingredients/check', { ingredients: [123, true] });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('must be strings');
  });

  it('POST with >100 ingredients returns 400', async () => {
    const bigList = Array.from({ length: 101 }, (_, i) => `ingredient${i}`);
    const res = await post('/ingredients/check', { ingredients: bigList });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Maximum 100');
  });

  it('uses fallback summary when Claude fails', async () => {
    mockInvoke.mockRejectedValue(new Error('Bedrock unreachable'));
    const res = await post('/ingredients/check', {
      ingredients: ['glycerin'],
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.summary).toContain('scores 100/100');
  });
});

describe('/ingredients/recommend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(
      JSON.stringify({
        seek: [
          {
            ingredient: 'NIACINAMIDE',
            reason: 'Controls sebum production',
            confidence: 'high',
          },
        ],
        avoid: [
          {
            ingredient: 'COCOS NUCIFERA OIL',
            reason: 'Comedogenic rating 4/5',
            confidence: 'high',
          },
        ],
      }),
    );
  });

  it('POST with valid skin_profile returns 200', async () => {
    const res = await post('/ingredients/recommend', {
      skin_profile: {
        skinType: 'oily',
        concerns: [{ name: 'acne', score: 70 }],
        topConcerns: ['acne', 'oiliness'],
        confidence: 0.8,
      },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.skin_type).toBe('oily');
    expect(data.top_concerns).toContain('acne');
    expect(data.seek).toHaveLength(1);
    expect(data.seek[0].ingredient).toBe('NIACINAMIDE');
    expect(data.avoid).toHaveLength(1);
  });

  it('POST with invalid skinType returns 400', async () => {
    const res = await post('/ingredients/recommend', {
      skin_profile: {
        skinType: 'greasy',
        concerns: [{ name: 'acne', score: 70 }],
        topConcerns: ['acne'],
        confidence: 0.8,
      },
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Invalid skinType');
  });

  it('POST with missing topConcerns returns 400', async () => {
    const res = await post('/ingredients/recommend', {
      skin_profile: {
        skinType: 'oily',
        concerns: [{ name: 'acne', score: 70 }],
        confidence: 0.8,
      },
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('topConcerns');
  });

  it('POST with missing skin_profile returns 400', async () => {
    const res = await post('/ingredients/recommend', {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('Missing "skin_profile"');
  });

  it('returns 500 when Claude fails', async () => {
    mockInvoke.mockRejectedValue(new Error('Bedrock down'));
    const res = await post('/ingredients/recommend', {
      skin_profile: {
        skinType: 'oily',
        concerns: [{ name: 'acne', score: 70 }],
        topConcerns: ['acne', 'oiliness'],
        confidence: 0.8,
      },
    });
    expect(res.status).toBe(500);
  });
});
