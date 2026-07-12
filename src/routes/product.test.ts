import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/bedrock', () => ({
  invokeClaude: vi.fn(),
}));

import { Hono } from 'hono';
import { invokeClaude } from '../lib/bedrock';
import { productRoutes } from './product';

const mockInvoke = vi.mocked(invokeClaude);

const testApp = new Hono();
testApp.route('/product', productRoutes);

function post(path: string, body: unknown) {
  return testApp.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const MOCK_MATCH_RESPONSE = JSON.stringify({
  score: 78,
  verdict: 'good',
  reasons: [
    'Contains niacinamide which controls sebum',
    'Glycerin provides lightweight hydration',
    'No highly comedogenic ingredients detected',
  ],
  watch_for: ['May be too rich for very oily T-zone'],
  ingredient_highlights: {
    beneficial: ['NIACINAMIDE', 'GLYCERIN'],
    neutral: ['CETYL ALCOHOL'],
    concerning: [],
  },
  confidence: 0.88,
  recommendation: 'Well-suited for your oily skin. Apply as a thin layer, especially on T-zone.',
});

describe('/product/match', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(MOCK_MATCH_RESPONSE);
  });

  it('POST with product_name + ingredients + skin_profile returns 200', async () => {
    const res = await post('/product/match', {
      product_name: 'CeraVe Moisturizing Cream',
      ingredients: ['glycerin', 'niacinamide', 'cetyl alcohol'],
      skin_profile: {
        skin_type: 'oily',
        top_concerns: ['acne', 'oiliness'],
      },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.product_name).toBe('CeraVe Moisturizing Cream');
    expect(data.score).toBe(78);
    expect(data.verdict).toBe('good');
    expect(data.reasons).toHaveLength(3);
    expect(data.confidence).toBe(0.88);
    expect(data.recommendation).toBeDefined();
    expect(data.ingredient_highlights).toBeDefined();
  });

  it('POST with product_name + skin_profile (no ingredients) returns 200', async () => {
    const res = await post('/product/match', {
      product_name: 'CeraVe Moisturizing Cream',
      skin_profile: {
        skin_type: 'oily',
        top_concerns: ['acne', 'oiliness'],
      },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.product_name).toBe('CeraVe Moisturizing Cream');
    expect(data.score).toBeDefined();
  });

  it('POST with missing product_name returns 400', async () => {
    const res = await post('/product/match', {
      ingredients: ['glycerin'],
      skin_profile: {
        skin_type: 'oily',
        top_concerns: ['acne'],
      },
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('product_name is required');
  });

  it('POST with missing skin_profile returns 400', async () => {
    const res = await post('/product/match', {
      product_name: 'CeraVe Moisturizing Cream',
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('skin_profile is required');
  });

  it('POST with missing skin_type in skin_profile returns 400', async () => {
    const res = await post('/product/match', {
      product_name: 'CeraVe Moisturizing Cream',
      skin_profile: {
        top_concerns: ['acne'],
      },
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('skin_type');
  });

  it('POST with empty top_concerns returns 400', async () => {
    const res = await post('/product/match', {
      product_name: 'CeraVe Moisturizing Cream',
      skin_profile: {
        skin_type: 'oily',
        top_concerns: [],
      },
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('top_concerns');
  });

  it('GET returns usage docs', async () => {
    const res = await testApp.request('/product/match', { method: 'GET' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.endpoint).toBe('/product/match');
    expect(data.price).toBe('$0.02');
  });

  it('returns 500 when Claude fails', async () => {
    mockInvoke.mockRejectedValue(new Error('Bedrock error'));
    const res = await post('/product/match', {
      product_name: 'CeraVe Moisturizing Cream',
      ingredients: ['glycerin'],
      skin_profile: {
        skin_type: 'oily',
        top_concerns: ['acne'],
      },
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('AI product assessment failed');
  });
});
