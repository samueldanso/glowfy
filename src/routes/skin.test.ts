import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../lib/bedrock', () => ({
  invokeClaude: vi.fn(),
}));

import { Hono } from 'hono';
import { invokeClaude } from '../lib/bedrock';
import { skinRoutes } from './skin';

const mockInvoke = vi.mocked(invokeClaude);

const testApp = new Hono();
testApp.route('/skin', skinRoutes);

function post(path: string, body: unknown) {
  return testApp.request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const MOCK_ANALYSIS_RESPONSE = JSON.stringify({
  skinType: 'oily',
  concerns: [
    { name: 'acne', score: 65 },
    { name: 'oiliness', score: 70 },
    { name: 'dryness', score: 10 },
    { name: 'sensitivity', score: 20 },
    { name: 'hyperpigmentation', score: 45 },
    { name: 'fine_lines', score: 5 },
    { name: 'redness', score: 15 },
    { name: 'large_pores', score: 55 },
    { name: 'uneven_texture', score: 30 },
    { name: 'dehydration', score: 25 },
  ],
  topConcerns: ['oiliness', 'acne', 'large_pores'],
  confidence: 0.72,
  analysis: 'Oily skin with moderate acne and enlarged pores.',
  recommendations_summary: 'Focus on oil control with niacinamide and BHA.',
});

describe('/skin/analyze', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(MOCK_ANALYSIS_RESPONSE);
  });

  it('POST with description returns 200 with skin analysis', async () => {
    const res = await post('/skin/analyze', {
      description: 'My skin is oily with frequent breakouts on forehead and chin',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.skin_type).toBe('oily');
    expect(data.concerns).toHaveLength(10);
    expect(data.top_concerns).toContain('oiliness');
    expect(data.confidence).toBe(0.72);
    expect(data.analysis).toBeDefined();
    expect(data.input_type).toBe('text');
  });

  it('POST with photo_url returns 200', async () => {
    const res = await post('/skin/analyze', {
      photo_url: 'https://example.com/face.jpg',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.skin_type).toBe('oily');
    expect(data.input_type).toBe('photo');
  });

  it('POST with neither photo_url nor description returns 400', async () => {
    const res = await post('/skin/analyze', {});
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('At least one of');
  });

  it('GET returns 200 with usage docs', async () => {
    const res = await testApp.request('/skin/analyze', { method: 'GET' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.endpoint).toBe('/skin/analyze');
    expect(data.usage).toBeDefined();
    expect(data.price).toBe('$0.05');
  });

  it('returns 500 when Claude fails', async () => {
    mockInvoke.mockRejectedValue(new Error('Bedrock error'));
    const res = await post('/skin/analyze', {
      description: 'My skin is dry',
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('AI analysis failed');
  });
});

describe('/skin/quiz', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInvoke.mockResolvedValue(MOCK_ANALYSIS_RESPONSE);
  });

  it('POST with valid quiz input returns 200', async () => {
    const res = await post('/skin/quiz', {
      skin_concerns: ['acne', 'oiliness', 'dark spots'],
      age: 28,
      climate: 'tropical humid',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.skin_type).toBe('oily');
    expect(data.concerns).toHaveLength(10);
    expect(data.top_concerns).toContain('oiliness');
    expect(data.input_type).toBe('quiz');
  });

  it('POST with missing skin_concerns returns 400', async () => {
    const res = await post('/skin/quiz', {
      age: 28,
      climate: 'tropical',
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('skin_concerns');
  });

  it('POST with empty skin_concerns returns 400', async () => {
    const res = await post('/skin/quiz', {
      skin_concerns: [],
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('skin_concerns');
  });

  it('GET returns usage docs', async () => {
    const res = await testApp.request('/skin/quiz', { method: 'GET' });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.endpoint).toBe('/skin/quiz');
    expect(data.price).toBe('$0.03');
  });

  it('returns 500 when Claude fails', async () => {
    mockInvoke.mockRejectedValue(new Error('Bedrock error'));
    const res = await post('/skin/quiz', {
      skin_concerns: ['acne'],
    });
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('AI analysis failed');
  });
});
